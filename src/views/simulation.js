import * as d3 from 'd3'

self.onmessage = function(e) {
  let aggregationPos = [], beforeAggregationPos = []
  const { nodes, graphAgg, id2entity } = e.data;
  Object.getOwnPropertyNames(graphAgg).forEach(key => {
    if (graphAgg[key].length === 0)
      delete graphAgg[key]
  })

  d3.selectAll('circle').each(function(d, i) {
    nodes[i].x = d3.select(this).attr("cx")
    nodes[i].y = d3.select(this).attr("cy")
  })

  Object.getOwnPropertyNames(graphAgg).forEach(startNode => {
    let NodesToAggregate = graphAgg[startNode]
    NodesToAggregate.forEach(item => {
      item.x = nodes.find(x => x.id === id2entity[item.index]).x
      item.y = nodes.find(x => x.id === id2entity[item.index]).y
      beforeAggregationPos[item.index] = [item.x, item.y]
    })
  })
  Object.getOwnPropertyNames(graphAgg).forEach(startNode => {
    let x_t = 0, y_t = 0
    graphAgg[startNode].forEach(item => {
      x_t += parseFloat(item.x)
      y_t += parseFloat(item.y)
    })
    x_t /= graphAgg[startNode].length
    y_t /= graphAgg[startNode].length
    graphAgg[startNode].forEach(item => {
      item.x = x_t
      item.y = y_t
      aggregationPos[item.index] = [x_t, y_t]
    })
  })
  
  self.postMessage({ beforeAggregationPos, aggregationPos });
};