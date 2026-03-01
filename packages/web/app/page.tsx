import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Quickstart } from "@/components/quickstart";
import { Footer } from "@/components/footer";

export default function Home() {
	return (
		<>
			<Header />
			<main>
				<Hero />
				<Quickstart />
			</main>
			<Footer />
		</>
	);
}
