import Head from "next/head";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { jStat } from 'jstat';

function welchTTest(mean1, mean2, stdDev1, stdDev2, sampleSize1, sampleSize2) {
    return (mean1 - mean2) / Math.sqrt((stdDev1 ** 2 / sampleSize1) + (stdDev2 ** 2 / sampleSize2));
}

function welchDegreeOfFreedom(stdDev1, sampleSize1, stdDev2, sampleSize2) {
    var numerator = ((stdDev1 ** 2 / sampleSize1) + (stdDev2 ** 2 / sampleSize2)) ** 2;
    var denominator = ((stdDev1 ** 2 / sampleSize1) ** 2) / (sampleSize1 - 1) + ((stdDev2 ** 2 / sampleSize2) ** 2) / (sampleSize2 - 1);
    return numerator / denominator;
}

const gen = (u, std) => {
    let nums = [];
    for (let i = -3; i <= 3; i++) {
        nums.push(
            u + (std * i)
        )
    }
    return nums;
}

const round = n => Math.round(((n * 1) + Number.EPSILON) * 100) / 100

function BoxPlot({ series }) {
    const chartRef = useRef(null);
    const plotRef = useRef(null);

    useLayoutEffect(() => {
        const module = import('apexcharts');

        ; (async function () {
            const ApexCharts = (await module).default;

            var options = {
                chart: {
                    type: "boxPlot"
                },
                series: [{
                    data: series
                }],
                plotOptions: {
                    bar: {
                        horizontal: true,
                        barHeight: '50%'
                    },
                    boxPlot: {
                        colors: {
                            upper: '#e9ecef',
                            lower: '#f8f9fa'
                        }
                    }
                },
                stroke: {
                    colors: ['#6c757d']
                }
            }
            plotRef.current?.destroy();
            plotRef.current = new ApexCharts(chartRef.current, options)
            plotRef.current.render();
        })();

        return () => {
            plotRef.current?.destroy();
        }
    }, [series])


    return (
        <div ref={chartRef}></div>
    )
}

function BarPlot({ series }) {
    const chartRef = useRef(null);
    const plotRef = useRef(null);

    useLayoutEffect(() => {
        const module = import('apexcharts');

        ; (async function () {
            const ApexCharts = (await module).default;

            var options = {
                chart: {
                    type: 'bar'
                },
                plotOptions: {
                    bar: {
                        horizontal: true
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: round,
                },
                series: [{ data: series }]
            }
            plotRef.current?.destroy();
            plotRef.current = new ApexCharts(chartRef.current, options)
            plotRef.current.render();
        })();

        return () => {
            plotRef.current?.destroy();
        }
    }, [series])

    return (
        <div ref={chartRef}></div>
    )
}

export default function tTest() {
    const [significance, setSig] = useState(0.05);
    const [groups, setGroups] = useState(() => {
        return [
            {
                name: 'Control',
                mean: 53.9624,
                stddev: 83.2523,
                count: 1128
            },
            {
                name: 'Blood Tests',
                mean: 61.8059,
                stddev: 56.2002,
                count: 1224
            },
            {
                name: 'Supplements',
                mean: 43.5993,
                stddev: 46.5578,
                count: 1144
            },
            {
                name: 'Premature Ejac',
                mean: 76.0424,
                stddev: 101.8017,
                count: 1132
            },
            {
                name: 'Weight Loss',
                mean: 81.945,
                stddev: 117.3758,
                count: 1138
            }
        ]
    })

    function handleUpdateGroup(key, index) {
        return function (e) {
            const value = e.currentTarget.value;
            setGroups(groups.map((g, i) => i === index ? ({ ...g, [key]: value }) : g))
        }
    }

    const control = groups[0];

    const variantsResults = groups.slice(1).map(variant => {
        const tValue = welchTTest(
            control.mean,
            variant.mean,
            control.stddev,
            variant.stddev,
            control.count,
            variant.count
        )
        const df = welchDegreeOfFreedom(
            control.stddev,
            control.count,
            variant.stddev,
            variant.count
        )
        return {
            pValue: jStat.ttest(tValue, df, 2),
            tScore: tValue,
            relativeDiff: (variant.mean - control.mean) / control.mean,
            variant,
            ci95: jStat.tci(variant.mean, significance, variant.stddev, variant.count)
        };
    })

    function buildQuery() {
        const params = new URLSearchParams();
        groups.forEach((g, i) => {
            Object.keys(g).forEach(k => {
                params.set(`group_${i}_${k}`, g[k])
            })
        })
        return params.toString()
    }

    useEffect(() => {
        const query = (typeof window !== 'undefined' ? window : global)?.location?.search;
        const params = new URLSearchParams(query);
        const result = [];

        Array.from(params.keys()).forEach(k => {
            const [_, index, key] = k.split('_');
            result[index * 1] = result[index * 1] || {};
            result[index * 1][key] = params.get(k);

            if (key !== 'name') {
                result[index * 1][key] *= 1;
            }
        });

        if (result.length > 0) {
            setGroups(result);
        }
    }, [])

    return (
        <div className="container">
            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <style jsx global>{`
                * {
                    box-sizing: border-box;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    background-color: #f4f5f8;
                    font-family: 'Figtree', sans-serif;
                    color: #5d5d60;
                }
            `}</style>
            <style jsx>{`
                .container {
                    padding: 24px;
                    min-height: 100vh;
                }

                .card-grid {
                    display: grid;
                    grid-template-columns: min-content 1fr;
                    grid-gap: 24px;
                }

                .card-stack {
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-gap: 24px;
                }

                .card {
                    padding: 18px;
                    background-color: #fff;
                    border-radius: 1px;
                    border: 1px solid #e8eaed;
                    box-shadow: 0px 0px 7px 4px #f3f3f3;
                    overflow: auto;
                    min-width: 400px;
                }

                .card-title {
                    margin-top: 0;
                    margin-bottom: 26px;
                    color: #5d5d60;
                    font-weight: 500;
                    font-size: 1.4em;
                }

                .card-inputs + .card-inputs {
                    margin-top: 16px;
                }

                .card-inputs__title {
                    margin-top: 0;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 24px;
                }

                .card-inputs__title input {
                    background: transparent;
                    padding-bottom: 6px;
                    padding-left: 0;
                    text-indent: -1px;
                    border: 0;
                    border-radius: 0;
                    margin-bottom: 8px;
                    text-align: left;
                    width: 100%;
                    border-bottom: 1px solid #c0c0c1;
                    outline: none;
                    font-size: 1em;
                    font-weight: 600;
                    font-family: 'Figtree', sans-serif;
                    color: #5d5d60;
                }

                .card-inputs__title button {
                    background: transparent;
                    border: 0;
                    padding: 0;
                    font-size: 1.25em;
                    color: #910707;
                    cursor: pointer;
                }

                .card-inputs__row {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    grid-gap: 8px;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .card-inputs__row p {
                    margin: 0;
                    color: #8e8e90;
                }

                .card-inputs__row input {
                    background: #fafafa;
                    border: 0;
                    border-bottom: 1px solid #c0c0c1;
                    outline: none;
                    border-radius: 0;
                    font-family: monospace;
                    color: #8e8e90;
                    text-align: right;
                    width: 80px;
                    font-size: 1em;
                }

                .card-actions {
                    margin-top: 28px;
                }

                .card-actions__link {
                    background: transparent;
                    color: #4ca0d6;
                    border: 0;
                    outline: 0;
                    padding: 0;
                    font-weight: 400;
                    cursor: pointer;
                    font-size: 1em;
                }

                .radio-options {
                    display: grid;
                    grid-template-columns: repeat(3, 90px);
                    grid-gap: 8px;
                    align-items: center;
                }

                .radio-option {
                    display: inline-flex;
                    align-items: center;
                    padding: 10px;
                    background: #f4f5f7;
                    border-radius: 8px;
                    cursor: pointer;
                }

                .radio-option input {
                    margin: 0;
                }

                .radio-option span {
                    flex-grow: 1;
                    text-align: right;
                }

                .chart-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-gap: 8px;
                    align-items: center;
                }

                .result {
                    border-left: 4px solid #c0c0c1;
                    padding: 8px;
                    border-radius: 2px;
                    background-color: #f4f5f7;
                    margin-top: 12px;
                }

                .result--sig-pos {
                    border-left: 4px solid #53b700;
                    background-color: #f3ffea;
                }

                .result--sig-pos .result-title {
                    color: #234c00;
                }

                .result--sig-neg {
                    border-left: 4px solid #ff8001;
                    background-color: #fff2e6;
                }

                .result--sig-neg .result-title {
                    color: #884400;
                }

                .result-title {
                    margin: 0;
                    font-weight: 500;
                }

                .result-body {
                    margin-bottom: 0;
                    margin-top: 8px;
                }

                .share input {
                    width: 100%;
                    height: 40px;
                    padding: 8px;
                    font-size: 1em;
                    border-radius: 4px;
                    border: 1px solid #c0c0c1;
                    color: #5d5d60;
                }

                @media screen and (max-width: 769px) {
                    .container {
                        padding: 16px;
                    }
                    .card {
                        min-width: 1px;
                        width: 100%;
                    }
                    .card-grid {
                        grid-template-columns: 1fr;
                    }
                    .chart-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="card-grid">
                <div className="card">
                    <h3 className="card-title">Sample groups</h3>
                    {groups.map((g, i) => (
                        <div key={i} className="card-inputs">
                            <p className="card-inputs__title">
                                {i === 0 ? <b>Control</b> : <input type="text" value={g.name} onChange={handleUpdateGroup('name', i)} />}
                                {groups.length > 2 && i !== 0 && (
                                    <button onClick={() => {
                                        setGroups(groups.filter((_, gi) => gi !== i))
                                    }}>&times;</button>
                                )}
                            </p>
                            <div className="card-inputs__row">
                                <p>Mean</p> <input value={g.mean} onChange={handleUpdateGroup('mean', i)} type="text" />
                            </div>
                            <div className="card-inputs__row">
                                <p>Std Dev</p> <input value={g.stddev} onChange={handleUpdateGroup('stddev', i)} type="text" />
                            </div>
                            <div className="card-inputs__row">
                                <p>Count</p> <input value={g.count} onChange={handleUpdateGroup('count', i)} type="text" />
                            </div>
                        </div>
                    ))}
                    <div className="card-actions">
                        <button onClick={() => setGroups([...groups, {
                            mean: 1,
                            stddev: 1,
                            count: 1,
                            name: `Variant ${groups.length}`
                        }])} className="card-actions__link">Add sample group</button>
                    </div>
                </div>
                <div className="card-stack">
                    <div className="card share">
                        <p style={{ marginTop: 0 }}><b>Share results</b></p>
                        <input readOnly style={{ width: '100%' }} type="url" value={`${global?.location?.origin}${global?.location?.pathname}?${buildQuery()}`} />
                    </div>

                    <div className="card">
                        <h3 className="card-title">Results</h3>
                        <p><b>Significance level</b></p>
                        <div className="radio-options">
                            <label className="radio-option" htmlFor="ninety">
                                <input type="radio" id="ninety" onChange={() => setSig(0.1)} name="significance" value="90" checked={significance === 0.1} />
                                <span>90%</span>
                            </label>
                            <label className="radio-option" htmlFor="ninetyfive">
                                <input type="radio" id="ninetyfive" onChange={() => setSig(0.05)} name="significance" value="95" checked={significance === 0.05} />
                                <span>95%</span>
                            </label>
                            <label className="radio-option" htmlFor="ninetynine">
                                <input type="radio" id="ninetynine" onChange={() => setSig(0.01)} name="significance" value="99" checked={significance === 0.01} />
                                <span>99%</span>
                            </label>
                        </div>
                        {variantsResults.map((v, i) => (
                            <div className={`result result--${v.pValue <= significance ? `sig-${v.relativeDiff > 0 ? 'pos' : 'neg'}` : 'neutral'}`} key={i}>
                                <p className="result-title">{v.pValue <= significance ? `Significant ${v.relativeDiff >= 0 ? 'positive' : 'negative'} result` : 'No significant difference'} (control vs {v.variant.name})</p>
                                {v.pValue <= significance ? (
                                    <p className="result-body">{v.variant.name}'s observed mean ({round(v.variant.mean)}) was {round(v.relativeDiff) * 100}% {v.relativeDiff > 0 ? 'higher' : 'lower'} than
                                        control's mean of ({round(control.mean)}). You can be {(1 - significance) * 100}% confident
                                        that this result is a consequence of the changes you made and not a result of
                                        random chance (p={v.pValue.toFixed(4)}).</p>
                                ) : (
                                    <p className="result-body">The observed difference in means ({round(v.relativeDiff) * 100}%)
                                        isn't big enough to declare a significant winner. There is no real
                                        difference in performance between Control and {v.variant.name} or you need to collect
                                        more data (p={v.pValue.toFixed(4)}).v</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="card">
                        <div className="chart-grid">
                            <div>
                                <p><b>Distributions</b></p>
                                <BoxPlot
                                    series={[
                                        {
                                            x: "Control",
                                            y: gen(control.mean * 1, control.stddev * 1)
                                        },
                                        ...variantsResults.map(v => ({
                                            x: v.variant.name,
                                            y: gen(v.variant.mean * 1, v.variant.stddev * 1)
                                        }))
                                    ]}
                                />
                            </div>
                            <div>
                                <p><b>Means</b></p>
                                <BarPlot
                                    series={[{
                                        x: 'Control',
                                        y: control.mean,
                                        fillColor: '#5d5d60'
                                    }].concat(
                                        variantsResults.map(v => {
                                            return ({
                                                x: v.variant.name,
                                                y: v.variant.mean,
                                                fillColor: v.variant.mean < control.mean ? '#ff8001' : '#53b700'
                                            })
                                        })
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}