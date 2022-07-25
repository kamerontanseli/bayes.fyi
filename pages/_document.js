import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html data-theme="light">
      <Head>
        <meta
          name="description"
          content="What is the probability that your test variation beats the original? Make a solid risk assessment whether to implement the variation or not."
        />
        <meta
          property="og:title"
          content="Bayesian A/B Test Results Calculator"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bayesian A/B Test Calculator" />
        <meta
          name="twitter:description"
          content="Find out if your test variation beats the original"
        />
        <meta name="twitter:image" content="https://bayes.fyi/meta.png" />
        <meta property="og:image" content="https://bayes.fyi/meta.png" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bayes.fyi/" />
        <link rel="icon" href="/favicon.ico" />
        <script async src="https://cdn.splitbee.io/sb.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
