import { Chat } from "@/components/Chat";
import { site } from "@/site.config";

export default function Home() {
  return (
    <main className="page">
      <nav className="nav">
        <strong>{site.name}</strong>
        <span className="badge">Powered by Zetra</span>
      </nav>

      <div className="hero">
        <div className="hero-copy">
          <h1>{site.tagline}</h1>
          <p className="lead">{site.description}</p>
          <ul className="features">
            {site.features.map((f) => (
              <li key={f.title}>
                <h2>{f.title}</h2>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <Chat welcome={site.welcome} suggestions={site.suggestions} />
      </div>

      <footer className="footer">
        © {new Date().getFullYear()} {site.name}
      </footer>
    </main>
  );
}
