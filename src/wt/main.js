const main = async () => {

  const dataPath = resolve(process.cwd(), 'data.json');
  let data;
  try {
    data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  } catch (error) {
    console.error('Failed to read data.json');
    return;
  }
  // dump commit
  const numCores = cpus().length;
  const chunkSize = Math.ceil(data.length / numCores);
  const workers = [];

  for (let i = 0; i < numCores; i++) {
    const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
    workers.push(new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker.js', import.meta.url));
      worker.postMessage(chunk);
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    }));
  }

  const sortedChunks = await Promise.all(workers);

  // k-way merge
  const result = [];
  const indices = new Array(numCores).fill(0);

  while (true) {
    let minValue = Infinity;
    let minIdx = -1;

    for (let i = 0; i < numCores; i++) {
      if (indices[i] < sortedChunks[i].length) {
        if (sortedChunks[i][indices[i]] < minValue) {
          minValue = sortedChunks[i][indices[i]];
          minIdx = i;
        }
      }
    }

    if (minIdx === -1) break;

    result.push(minValue);
    indices[minIdx]++;
  }

  console.log(result);
};

await main();
