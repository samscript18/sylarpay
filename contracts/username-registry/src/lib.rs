#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};
#[contracttype]
#[derive(Clone)]
enum Key {
    Owner(String),
    Pending(String),
    Verified(Address),
    Admin,
}
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    Invalid = 1,
    Taken = 2,
    Missing = 3,
    NoProposal = 4,
    AlreadyInitialized = 5,
    SameOwner = 6,
}
#[contract]
pub struct UsernameRegistry;
fn valid(name: &String) -> Result<(), Error> {
    let n = name.len();
    if n < 3 || n > 24 {
        return Err(Error::Invalid);
    }
    let mut buf = [0u8; 24];
    name.copy_into_slice(&mut buf[..n as usize]);
    for b in &buf[..n as usize] {
        if !((*b >= b'a' && *b <= b'z') || (*b >= b'0' && *b <= b'9') || *b == b'_') {
            return Err(Error::Invalid);
        }
    }
    Ok(())
}
fn owner(env: &Env, name: &String) -> Result<Address, Error> {
    valid(name)?;
    let key = Key::Owner(name.clone());
    let value = env.storage().persistent().get(&key).ok_or(Error::Missing)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, 100_000, 500_000);
    Ok(value)
}
#[contractimpl]
impl UsernameRegistry {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&Key::Admin, &admin);
        env.storage().instance().extend_ttl(100_000, 500_000);
    }
    pub fn register(env: Env, name: String, address: Address) -> Result<(), Error> {
        valid(&name)?;
        env.storage().instance().extend_ttl(100_000, 500_000);
        address.require_auth();
        let key = Key::Owner(name);
        if env.storage().persistent().has(&key) {
            return Err(Error::Taken);
        }
        env.storage().persistent().set(&key, &address);
        env.storage()
            .persistent()
            .extend_ttl(&key, 100_000, 500_000);
        Ok(())
    }
    pub fn resolve(env: Env, name: String) -> Result<Address, Error> {
        owner(&env, &name)
    }
    pub fn owner_of(env: Env, name: String) -> Result<Address, Error> {
        owner(&env, &name)
    }
    pub fn exists(env: Env, name: String) -> Result<bool, Error> {
        valid(&name)?;
        Ok(env.storage().persistent().has(&Key::Owner(name)))
    }
    pub fn propose_transfer(env: Env, name: String, new_owner: Address) -> Result<(), Error> {
        let current = owner(&env, &name)?;
        current.require_auth();
        if current == new_owner {
            return Err(Error::SameOwner);
        }
        let key = Key::Pending(name);
        env.storage().persistent().set(&key, &new_owner);
        env.storage()
            .persistent()
            .extend_ttl(&key, 100_000, 500_000);
        Ok(())
    }
    pub fn cancel_transfer(env: Env, name: String) -> Result<(), Error> {
        owner(&env, &name)?.require_auth();
        env.storage().persistent().remove(&Key::Pending(name));
        Ok(())
    }
    pub fn accept_transfer(env: Env, name: String) -> Result<(), Error> {
        owner(&env, &name)?;
        let new_owner: Address = env
            .storage()
            .persistent()
            .get(&Key::Pending(name.clone()))
            .ok_or(Error::NoProposal)?;
        new_owner.require_auth();
        env.storage()
            .persistent()
            .set(&Key::Owner(name.clone()), &new_owner);
        env.storage().persistent().remove(&Key::Pending(name));
        Ok(())
    }
    pub fn set_verification(env: Env, address: Address, verified: bool) {
        let admin: Address = env.storage().instance().get(&Key::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().extend_ttl(100_000, 500_000);
        let key = Key::Verified(address);
        env.storage().persistent().set(&key, &verified);
        env.storage()
            .persistent()
            .extend_ttl(&key, 100_000, 500_000);
    }
    pub fn verification_status(env: Env, address: Address) -> bool {
        let key = Key::Verified(address);
        if env.storage().persistent().has(&key) {
            env.storage()
                .persistent()
                .extend_ttl(&key, 100_000, 500_000);
        }
        env.storage().persistent().get(&key).unwrap_or(false)
    }
}
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    fn setup() -> (Env, Address, Address) {
        let e = Env::default();
        let admin = Address::generate(&e);
        let id = e.register(UsernameRegistry, (&admin,));
        (e, id, admin)
    }
    #[test]
    fn registration_resolution_duplicate_missing() {
        let (e, id, _) = setup();
        e.mock_all_auths();
        let c = UsernameRegistryClient::new(&e, &id);
        let a = Address::generate(&e);
        let sam = String::from_str(&e, "sam");
        c.register(&sam, &a);
        assert_eq!(c.resolve(&sam), a);
        assert!(c.exists(&sam));
        assert_eq!(c.try_register(&sam, &a), Err(Ok(Error::Taken)));
        assert_eq!(
            c.try_resolve(&String::from_str(&e, "missing")),
            Err(Ok(Error::Missing))
        );
    }
    #[test]
    fn invalid_names() {
        let (e, id, _) = setup();
        e.mock_all_auths();
        let c = UsernameRegistryClient::new(&e, &id);
        let a = Address::generate(&e);
        for s in [
            "",
            "ab",
            "Sam",
            "@sam",
            "sam smith",
            "abcdefghijklmnopqrstuvwxyz",
            "sam-1",
        ] {
            assert_eq!(
                c.try_register(&String::from_str(&e, s), &a),
                Err(Ok(Error::Invalid))
            );
        }
    }
    #[test]
    fn two_step_transfer_verification_is_address_based() {
        let (e, id, _) = setup();
        e.mock_all_auths();
        let c = UsernameRegistryClient::new(&e, &id);
        let a = Address::generate(&e);
        let b = Address::generate(&e);
        let n = String::from_str(&e, "sam");
        c.register(&n, &a);
        c.set_verification(&a, &true);
        c.propose_transfer(&n, &b);
        assert_eq!(c.resolve(&n), a);
        c.accept_transfer(&n);
        assert_eq!(c.resolve(&n), b);
        assert!(!c.verification_status(&b));
        assert!(c.verification_status(&a));
        assert_eq!(c.try_accept_transfer(&n), Err(Ok(Error::NoProposal)));
    }
    #[test]
    #[should_panic]
    fn unauthorized_registration() {
        let (e, id, _) = setup();
        UsernameRegistryClient::new(&e, &id)
            .register(&String::from_str(&e, "sam"), &Address::generate(&e));
    }
    #[test]
    #[should_panic]
    fn unauthorized_transfer() {
        let (e, id, _) = setup();
        let c = UsernameRegistryClient::new(&e, &id);
        let a = Address::generate(&e);
        e.mock_all_auths();
        c.register(&String::from_str(&e, "sam"), &a);
        e.mock_auths(&[]);
        c.propose_transfer(&String::from_str(&e, "sam"), &Address::generate(&e));
    }
    #[test]
    #[should_panic]
    fn unauthorized_accept() {
        let (e, id, _) = setup();
        let c = UsernameRegistryClient::new(&e, &id);
        let n = String::from_str(&e, "sam");
        e.mock_all_auths();
        c.register(&n, &Address::generate(&e));
        c.propose_transfer(&n, &Address::generate(&e));
        e.mock_auths(&[]);
        c.accept_transfer(&n);
    }
    #[test]
    #[should_panic]
    fn unauthorized_verification() {
        let (e, id, _) = setup();
        UsernameRegistryClient::new(&e, &id).set_verification(&Address::generate(&e), &true);
    }
}
