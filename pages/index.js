import '@picocss/pico/css/pico.min.css';
import "react-vis/dist/style.css";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import {
  XYPlot,
  XAxis,
  YAxis,
  VerticalGridLines,
  HorizontalGridLines,
  VerticalBarSeries,
  LabelSeries,
} from "react-vis";
import ClipboardJS from "clipboard";

import exp from "@stdlib/math-base-special-exp";
import logbeta from "@stdlib/math-base-special-betaln";
import log from "@stdlib/math-base-special-ln";

function probXBeatsY(a, b, c, d) {
  let total = 0;
  for (let i = 0; i < c; i++) {
    total += exp(
      logbeta(a + i, d + b) - log(d + i) - logbeta(1 + i, d) - logbeta(a, b)
    );
  }
  return 1 - total;
}

function expectedLossForPickingY(a, b, c, d) {
  const probability = (x, y) => {
    return exp(logbeta(x + 1, y) - logbeta(x, y));
  };

  return (
    probability(a, b) * probXBeatsY(a + 1, b, c, d) -
    probability(c, d) * probXBeatsY(a, b, c + 1, d)
  );
}

export default function Home() {
  const chartContainer = useRef(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [chartWidth, setChartWidth] = useState(330);
  const [formData, setData] = useState({
    usersA: 203,
    conversionsA: 13,
    usersB: 204,
    conversionsB: 23,
    threshold: 90,
    lossThreshold: 0.05,
  });
  const {
    usersA,
    conversionsA,
    usersB,
    conversionsB,
    threshold,
    lossThreshold,
  } = formData;
  const [probBWins, setProbBWins] = useState(0);
  const [expectedLoss, setExpectedLoss] = useState({
    control: 0,
    treatment: 0,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newData = {
      usersA: Number(params.get("usersA") || 203),
      conversionsA: Number(params.get("conversionsA") || 13),
      usersB: Number(params.get("usersB") || 204),
      conversionsB: Number(params.get("conversionsB") || 23),
      threshold: Number(params.get("threshold") || 95),
      lossThreshold: Number(params.get("lossThreshold") || 0.06),
    };
    setData(newData);
    setMounted(true);
    generateResults(
      newData.usersA,
      newData.conversionsA,
      newData.usersB,
      newData.conversionsB
    );
    const clipboard = new ClipboardJS("#shareURL");

    return () => {
      clipboard.destroy();
    };
  }, []);

  useEffect(() => {
    function listener() {
      if (chartContainer.current) {
        setChartWidth(chartContainer.current.getBoundingClientRect().width);
      }
    }

    window.addEventListener("resize", listener);

    listener();

    return () => {
      window.removeEventListener("resize", listener);
    };
  }, [chartContainer]);

  function generateResults(uA, cA, uB, cB) {
    const params = new URLSearchParams();
    Object.keys(formData).forEach((key) => {
      params.set(key, formData[key]);
    });
    router.push(`/?${params.toString()}`, `/?${params.toString()}`, {
      shallow: true,
    });
    const [a, b, c, d] = [cA + 1, uA - cA + 1, cB + 1, uB - cB + 1];
    setProbBWins(probXBeatsY(c, d, a, b));
    setExpectedLoss({
      treatment: expectedLossForPickingY(a, b, c, d),
      control: expectedLossForPickingY(c, d, a, b),
    });
  }

  function onChangeField(key) {
    return (e) => {
      const value = Number(e.currentTarget.value);
      setData((d) => ({
        ...d,
        [key]: value,
      }));
    };
  }

  const chartData = [
    {
      x: "A",
      label: `${Math.max(0, 100 - probBWins * 100).toFixed(2)}%`,
      y: Math.max(0, 100 - probBWins * 100),
      color: 0,
    },
    {
      x: "B",
      label: `${(Math.max(0, probBWins) * 100).toFixed(2)}%`,
      y: Math.max(0, probBWins) * 100,
      color: 1,
    },
  ];

  const BWins =
    probBWins >= threshold / 100 && expectedLoss.treatment <= lossThreshold;

  const uplift =
    (conversionsB / usersB - conversionsA / usersA) / (conversionsA / usersA);

  return (
    <div className="container">
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        hgroup {
          margin-top: 16px;
        }

        .table {
          max-width: 100%;
          overflow: auto;
        }

        .copy {
          display: flex;
        }

        .copy input {
          flex-grow: 1;
        }

        .copy button {
          width: auto;
          margin-left: 16px;
        }

        @media screen and (max-width: 480px) {
          .table th {
            font-size: 0.8em;
          }
        }
      `}</style>
      <Head>
        <title>Bayesian A/B Test Results Calculator</title>
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
      <hgroup>
        <h1>Bayesian A/B-test Calculator</h1>
        <h3>
          What is the probability that your test variation beats the original?
          Make a solid risk assessment whether to implement the variation or
          not. Built from formulas by{" "}
          <a
            target="_blank"
            href="https://www.evanmiller.org/bayesian-ab-testing.html#binary_ab"
          >
            Evan Miller
          </a>{" "}
          &amp;
          <a
            target="_blank"
            href="https://www.chrisstucchio.com/blog/2014/bayesian_ab_decision_rule.html"
          >
            {" "}
            Chris Stucchio
          </a>
          .
        </h3>
      </hgroup>
      <div className="grid">
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generateResults(usersA, conversionsA, usersB, conversionsB);
            }}
          >
            <p
              style={{
                marginTop: 0,
                marginBottom: 16,
                borderBottom: `1px solid #eee`,
                paddingBottom: 8,
              }}
            >
              <b>Test data</b>
            </p>

            <div className="grid">
              <div>
                <label htmlFor="usersA">Control users</label>
                <input
                  required
                  type="number"
                  name="usersA"
                  id="usersA"
                  placeholder="200"
                  value={usersA}
                  onChange={onChangeField("usersA")}
                />
              </div>
              <div>
                <label htmlFor="conversionsA">Control conversions</label>
                <input
                  required
                  type="number"
                  name="conversionsA"
                  id="conversionsA"
                  placeholder="30"
                  value={conversionsA}
                  onChange={onChangeField("conversionsA")}
                />
              </div>
            </div>
            <div className="grid">
              <div>
                <label htmlFor="usersB">Treatment users</label>
                <input
                  required
                  type="number"
                  name="usersB"
                  id="usersB"
                  placeholder="200"
                  value={usersB}
                  onChange={onChangeField("usersB")}
                />
              </div>
              <div>
                <label htmlFor="conversionsB">Treatment conversions</label>
                <input
                  required
                  type="number"
                  name="conversionsB"
                  id="conversionsB"
                  placeholder="30"
                  value={conversionsB}
                  onChange={onChangeField("conversionsB")}
                />
              </div>
            </div>
            <details>
              <summary>Advanced settings</summary>
              <div className="grid">
                <div>
                  <label htmlFor="threshold">Probability threshold (%)</label>
                  <input
                    required
                    type="number"
                    name="threshold"
                    id="threshold"
                    placeholder="95"
                    value={threshold}
                    onChange={onChangeField("threshold")}
                  />
                </div>
                <div>
                  <label htmlFor="lossThreshold">
                    Expected loss threshold (%)
                  </label>
                  <input
                    required
                    type="number"
                    name="lossThreshold"
                    id="lossThreshold"
                    placeholder="0.05"
                    step="0.01"
                    value={lossThreshold}
                    onChange={onChangeField("lossThreshold")}
                  />
                </div>
              </div>
            </details>
            <button type="submit">Make Calculation</button>
          </form>
        </div>
        <div ref={chartContainer}>
          <p
            style={{
              marginTop: 0,
              marginBottom: 16,
              borderBottom: `1px solid #eee`,
              paddingBottom: 8,
            }}
          >
            <b>Chance of winning</b>
          </p>
          {mounted && (
            <>
              <XYPlot
                margin={{ left: 70 }}
                yDomain={[0, 100]}
                xType="ordinal"
                colorRange={
                  probBWins > 0.5
                    ? ["#ff9797", "#57efa5"]
                    : ["#57efa5", "#ff9797"]
                }
                width={chartWidth}
                height={400}
              >
                <VerticalGridLines />
                <HorizontalGridLines />
                <XAxis tickLabelAngle={-45} />
                <YAxis tickFormat={(v) => `${v}%`} />
                <LabelSeries
                  animation
                  allowOffsetToBeReversed
                  data={chartData}
                />
                <VerticalBarSeries animation data={chartData} />
              </XYPlot>
            </>
          )}
        </div>
      </div>
      {mounted && (
        <>
          <p
            style={{
              marginTop: 0,
              marginBottom: 16,
              borderBottom: `1px solid #eee`,
              paddingBottom: 8,
            }}
          >
            <b>Results</b>
          </p>
          <figure>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Users</th>
                  <th>Convs</th>
                  <th>CR</th>
                  <th>Probability of winning</th>
                  <th>Expected loss if chosen</th>
                  <th>Winner?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Control</td>
                  <td>{usersA}</td>
                  <td>{conversionsA}</td>
                  <td>{((conversionsA / usersA) * 100).toFixed(2)}%</td>
                  <td>{((1 - Math.max(0, probBWins)) * 100).toFixed(2)}%</td>
                  <td>{expectedLoss.treatment.toFixed(2)}%</td>
                  <td>{!BWins ? "✅" : "❌"}</td>
                </tr>
                <tr>
                  <td>Treatment</td>
                  <td>{usersB}</td>
                  <td>{conversionsB}</td>
                  <td>
                    {((conversionsB / usersB) * 100).toFixed(2)}% (
                    {uplift > 0 ? "+" : ""}
                    {(uplift * 100).toFixed(2)}% )
                  </td>
                  <td>{(Math.max(0, probBWins) * 100).toFixed(2)}%</td>
                  <td>{expectedLoss.control.toFixed(2)}%</td>
                  <td>{BWins ? "✅" : "❌"}</td>
                </tr>
              </tbody>
            </table>
          </figure>
          <p
            style={{
              marginTop: 0,
              marginBottom: 16,
              borderBottom: `1px solid #eee`,
              paddingBottom: 8,
            }}
          >
            <b>Share the results</b>
          </p>
          <div className="copy">
            <input type="url" value={`https://bayes.fyi${router.asPath}`} />{" "}
            <button
              id="shareURL"
              data-clipboard-text={`https://bayes.fyi${router.asPath}`}
              onClick={(e) => {
                const element = e.target;
                element.innerText = "Copied";
                setTimeout(() => {
                  element.innerText = "Copy";
                }, 1500);
                window?.splitbee?.track?.("Copied Share URL");
              }}
            >
              Copy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
