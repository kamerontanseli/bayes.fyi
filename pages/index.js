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

const chi2gofMod = import("@stdlib/stats-chi2gof");
const jStatMod = import("jstat");
const lnMod = import("@stdlib/math-base-special-ln");
const betalnMod = import("@stdlib/math-base-special-betaln");

async function betaRVS(successes, failures, size = 10000) {
  const results = [];
  const jStat = (await jStatMod).default;
  for (let i = 0; i < size; i++) {
    results.push(jStat.beta.sample(successes, failures));
  }
  return results;
}

async function calculateProbabilities(alphaA, betaA, alphaB, betaB) {
  let total = 0;
  const betaln = (await betalnMod).default;
  const ln = (await lnMod).default;
  for (let i = 0; i <= alphaB - 1; i++) {
    total += Math.exp(
      betaln(alphaA + i, betaB + betaA) -
        ln(betaB + i) -
        betaln(1 + i, betaB) -
        betaln(alphaA, betaA)
    );
  }
  return total;
}

async function SRMCheck(usersA, usersB) {
  const total = usersA + usersB;
  const expectedVisitors = Math.floor(total / 2);
  const chi2gof = (await chi2gofMod).default;

  return chi2gof([usersA, usersB], [expectedVisitors, expectedVisitors]).pValue;
}

async function calculateExpectedLoss(
  successesA,
  failuresA,
  successesB,
  failuresB
) {
  const controlSample = await betaRVS(successesA, failuresA);
  const variantSample = await betaRVS(successesB, failuresB);
  const zippedValues = controlSample.map((c, i) => [c, variantSample[i]]);

  const controlDiffList = zippedValues.map(([a, b]) => Math.max(a - b, 0));
  const controlSumDiff = controlDiffList.reduce((a, b) => a + b, 0);
  const expectedLossControl = (controlSumDiff / 10000) * 100;

  const treatmentDiffList = zippedValues.map(([a, b]) => Math.max(b - a, 0));
  const treatmentSumDiff = treatmentDiffList.reduce((a, b) => a + b, 0);
  const expectedLossTreatment = (treatmentSumDiff / 10000) * 100;

  return {
    control: expectedLossControl,
    treatment: expectedLossTreatment,
  };
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
    threshold: 95,
    lossThreshold: 0.06,
  });
  const {
    usersA,
    conversionsA,
    usersB,
    conversionsB,
    threshold,
    lossThreshold,
  } = formData;
  const [srmPValue, setSrmPValue] = useState(1);
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

  async function generateResults(uA, cA, uB, cB) {
    const params = new URLSearchParams();
    Object.keys(formData).forEach((key) => {
      params.set(key, formData[key]);
    });
    router.push(`/?${params.toString()}`, `/?${params.toString()}`, {
      shallow: true,
    });
    const args = [cA, uA - cA, cB, uB - cB];
    setProbBWins(await calculateProbabilities(...args));
    setExpectedLoss(await calculateExpectedLoss(...args));
    setSrmPValue(await SRMCheck(uA, uB));
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
    probBWins >= threshold / 100 || expectedLoss.control <= lossThreshold;

  const uplift =
    (conversionsB / usersB - conversionsA / usersA) / (conversionsA / usersA);

  return (
    <div className="container">
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
            href="https://vwo.com/downloads/VWO_SmartStats_technical_whitepaper.pdf"
          >
            {" "}
            VWO
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
          {srmPValue <= 0.05 && (
            <p className="alert">
              <strong>Possible SRM Alert</strong>. Assuming you intented to have
              a 50% / 50% split, a Sample Ratio Mismatch (SRM) check indicates
              there might be a problem with your distribution.{" "}
              <i>P-Value = {srmPValue.toFixed(5)}</i>
            </p>
          )}
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
