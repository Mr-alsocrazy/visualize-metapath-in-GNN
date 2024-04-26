import * as d3 from 'd3'

self.onmessage = function(e) {
  const { nodes, links, width, height } = e.data;
  let simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(height / 2, width / 2));
  simulation.tick(Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())))

  console.log(nodes)
  self.postMessage({ nodes, links });
};