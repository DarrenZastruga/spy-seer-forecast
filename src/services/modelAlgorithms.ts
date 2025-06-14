
export function lassoRegression(X: number[][], y: number[], lambda: number): { coefficients: number[], residuals: number[] } {
  const n = X.length;
  const p = X[0].length;
  let beta = new Array(p).fill(0);
  const maxIter = 100;
  const tolerance = 1e-4;

  // Standardize features (except intercept)
  const means = new Array(p).fill(0);
  const stds = new Array(p).fill(1);

  for (let j = 1; j < p; j++) {
    means[j] = X.reduce((sum, row) => sum + row[j], 0) / n;
    const variance = X.reduce((sum, row) => sum + Math.pow(row[j] - means[j], 2), 0) / n;
    stds[j] = Math.sqrt(variance) || 1;
  }

  // Standardize X
  const XStd = X.map(row => row.map((val, j) => j === 0 ? val : (val - means[j]) / stds[j]));

  for (let iter = 0; iter < maxIter; iter++) {
    const oldBeta = [...beta];

    for (let j = 0; j < p; j++) {
      const partialResidual = y.map((yi, i) => {
        let sum = 0;
        for (let k = 0; k < p; k++) {
          if (k !== j) sum += XStd[i][k] * beta[k];
        }
        return yi - sum;
      });

      const correlation = partialResidual.reduce((sum, r, i) => sum + r * XStd[i][j], 0) / n;

      if (j === 0) {
        beta[j] = correlation;
      } else {
        const threshold = lambda / n;
        if (correlation > threshold) {
          beta[j] = correlation - threshold;
        } else if (correlation < -threshold) {
          beta[j] = correlation + threshold;
        } else {
          beta[j] = 0;
        }
      }
    }

    const change = beta.reduce((sum, b, j) => sum + Math.abs(b - oldBeta[j]), 0);
    if (change < tolerance) break;
  }

  const residuals = y.map((yi, i) => {
    const predicted = beta.reduce((sum, b, j) => sum + XStd[i][j] * b, 0);
    return yi - predicted;
  });

  return { coefficients: beta, residuals };
}


export function simulateRandomForestOnResiduals(
  residuals: number[],
  features: number[][],
  nEstimators: number,
  daysAhead: number
): number[] {
  const predictions = [];

  for (let tree = 0; tree < nEstimators; tree++) {
    // Bootstrap sample from residuals
    const bootstrapIndices = Array.from({ length: residuals.length }, () => 
      Math.floor(Math.random() * residuals.length)
    );
    const bootstrapResiduals = bootstrapIndices.map(i => residuals[i]);
    const meanResidual = bootstrapResiduals.reduce((sum, r) => sum + r, 0) / bootstrapResiduals.length;

    // Add some randomness
    const treeFactor = (Math.random() - 0.5) * 0.01 * Math.sqrt(daysAhead);
    const prediction = meanResidual + treeFactor;

    predictions.push(prediction);
  }

  return predictions;
}
