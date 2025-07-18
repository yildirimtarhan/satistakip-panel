import Head from "next/head";
import styles from "@/styles/Home.module.css";

export default function Home() {
  return (
    <>
      <Head>
        <title>Satış Takip Paneli</title>
        <meta name="description" content="Satışlarınızı kolayca takip edin" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.page} style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        <main className={styles.main}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Satış Takip Paneline Hoş Geldiniz
          </h1>
          <p>Sisteme giriş yapmak için yukarıdan "Giriş Yap" butonunu kullanın.</p>
        </main>

        <footer className={styles.footer} style={{ marginTop: "3rem" }}>
          <p>© {new Date().getFullYear()} Satış Takip</p>
        </footer>
      </div>
    </>
  );
}
