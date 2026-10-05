import Link from "next/link";
export default function NotFound() {
	return (
		<main className="workspace">
			<div className="empty-state">
				<h1>That page wasn’t found.</h1>
				<p>Check the username or return to SylarPay.</p>
				<Link className="button" href="/">
					Back home
				</Link>
			</div>
		</main>
	);
}
