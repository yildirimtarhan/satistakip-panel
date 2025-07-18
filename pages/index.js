import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>Satış Takip Paneli</title>
        <meta name="description" content="Satışlarınızı kolayca takip edin" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          Satış Takip Paneline Hoş Geldiniz
        </h1>
        <p>
          Sisteme giriş yapmak için{" "}
          <Link href="/auth/login">
            <strong style={{ color: "#0070f3", cursor: "pointer" }}>
              Giriş Yap
            </strong>
          </Link>{" "}
          sayfasını kullanın.
        </p>

        <footer style={{ marginTop: "3rem" }}>
          <p>© {new Date().getFullYear()} Satış Takip</p>
        </footer>
      </div>
    </>
  );
}
