<template>
  <div>
    <el-row>
      <el-col :span="20" justify="start">
        <svg ref="svg" :height="height" :width="width" id="svg"></svg>
      </el-col>
      <el-col :span="4">
        <svg id="legend"></svg>
      </el-col>
    </el-row>
    <el-row>
      <svg id="paths" :height="height" :width="width"></svg>
    </el-row>
    
    <button @click="findPaths(1, 1764)">
      搜索
    </button>
    <button @click="aggregateNodes">
      隐藏
    </button>
    <button @click="deAggregateNodes">
      显示
    </button>
  </div>
</template>

<script>
import { onMounted, ref, shallowReactive } from 'vue';
import axios from 'axios';
import * as d3 from 'd3';


export default {
  name: "VisualizationVue",
  setup() {
    let visData = shallowReactive({
      id2entity: Object(),
      id2relation: Object(),
      in_degree: Object(),
      out_degree: Object(),
      graph: Object(),
      embedding: Object(),
      entity2id: Object(),
    });

    let height = ref(1000)
    let width = ref(1000)

    let link = {}, node = {}, graphAgg = {}, nodeToAggregate = {}, linkToAggregate = {};
    let links = [], nodes = []; // datum
    let aggregationPos = {}, beforeAggregationPos = {};
    let edgeLegend = [];
    let category18 = [
      '#56ebd3', '#197959', '#1be46d', '#6e9f23', '#bbe272', '#2f5672', '#8bd0eb', 
      '#7f20ac', '#9785d7', '#4e45a3', '#d179f8', '#9b1b5c', '#f2c8e8', '#75435b', 
      '#fb0998', '#e4659b', '#3f16f9', '#ea3ffc'
    ]

    const color = d3.scaleOrdinal(category18)

    onMounted(() => {
      axios.get('http://127.0.0.1:5000/vis')
      .then(
        res => {
          visData.id2entity = res.data.id2entity;
          visData.id2relation = res.data.id2relation;
          visData.graph = JSON.parse(res.data.graph);
          visData.in_degree = JSON.parse(res.data.in_degree);
          visData.out_degree = JSON.parse(res.data.out_degree);
          visData.embedding = res.data.embedding;
          visData.entity2id = Object.fromEntries(
            Object.entries(visData.id2entity).map(([k, v]) => [v, k])
          )
          init();
        }
      )
    });

    function init() {
      const svg = d3.select("#svg")
      svg.attr('viewBox', [0, 0, width.value, height.value])
      const legend = d3.select("#legend")
      let graph = svg.append('g')
      let nodelist = []
      for (let n in visData.graph) {
        nodelist.push(n)
        graphAgg[n] = [];
        visData.graph[n].forEach(neighbor => {
          links.push({
            source: visData.id2entity[n], 
            type: visData.id2relation[neighbor[0]], 
            target: visData.id2entity[neighbor[1]],
            color: neighbor[0]
          })
          nodelist.push(neighbor[1])
          if ((visData.in_degree[neighbor[1]] <= 1) 
          && (visData.out_degree[neighbor[1]] === undefined)) {
            graphAgg[n].push({'index': neighbor[1]})
          }
        });
      }
      nodelist = Array.from(new Set(nodelist.map(x => parseInt(x))))

      // 将nodes中的id从代号转换为实体名称
      let keys = nodelist.map(id => visData.id2entity[id])
      nodes = Object.values(keys).map((name) => ({
        'id': name
      }));

      // // 更新布局
      // let simulation = d3.forceSimulation(nodes)
      //   .force("link", d3.forceLink(links).id(d => d.id))
      //   .force("charge", d3.forceManyBody())
      //   .force("center", d3.forceCenter(height.value / 2, width.value / 2))
      //   .force("x", d3.forceX())
      //   .force("y", d3.forceY())
      //   .stop();

      // simulation.tick(Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())))

      const worker = new Worker(new URL('simulation.js', import.meta.url))
      worker.postMessage({
        nodes, 
        links, 
        width: width.value, 
        height: height.value
      })

      worker.onmessage = (e) => { 
        console.log(e.data)
        nodes = e.data.nodes
        links = e.data.links
        // 创建链接
        let legendMap = {}
        link = graph.append('g')
          .attr('stroke-opacity', 0.5)
          .attr('stroke-width', 2)
          .selectAll('line')
          .data(links)
          .join('line')
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y)
          .attr('stroke', (d) => {
            legendMap[d.type] = d.color
            return color(d.color)
          });

        edgeLegend = Object.entries(legendMap).map(([k, v]) => ({'type': k, 'color': v}))

        console.log(visData.entity2id)

        // 创建节点
        // node.id中的id是实体名称，并非三元组中实体的index，便于在有需要时展示实体名称
        // 其他地方与实体有关的全部是index，方便转换可以使用entity2id & id2entity
        node = graph.append('g')
          .attr('stroke', '0xfff')
          .attr('stroke-width', 1.5)
          .selectAll('circle')
          .data(nodes)
          .join('circle')
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr('r', 4)

        nodeToAggregate = node.filter(
          d => {
            return visData.in_degree[visData.entity2id[d.id]] === 1 
            && visData.out_degree[visData.entity2id[d.id]] === undefined
          }
        )

        linkToAggregate = link.filter(
          d => visData.in_degree[visData.entity2id[d.target.id]] === 1 
          && visData.out_degree[visData.entity2id[d.target.id]] === undefined
        )

        Object.getOwnPropertyNames(graphAgg).forEach(key => {
          if (graphAgg[key].length === 0)
            delete graphAgg[key]
        })

        d3.selectAll('circle').each(function(d, i) {
          nodes[i].x = d3.select(this).attr("cx")
          nodes[i].y = d3.select(this).attr("cy")
        })

        console.log(node)

        Object.getOwnPropertyNames(graphAgg).forEach(startNode => {
          let NodesToAggregate = graphAgg[startNode]
          NodesToAggregate.forEach(item => {
            item.x = nodes.find(x => x.id === visData.id2entity[item.index]).x
            item.y = nodes.find(x => x.id === visData.id2entity[item.index]).y
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
        svg.call(d3.zoom()
          .extent([[0, 0], [width.value, height.value]])
          .scaleExtent([1, 8])
          .on("zoom", ({transform}) => {
            graph.attr('transform', transform)
            // node.attr("r", 4 / transform.k)
            // svg.selectAll('.metapath').attr('stroke-width', 5 / transform.k)
            // svg.selectAll('.link').attr('storke-width', 2 / transform.k)
          }));
        legend.append('g')
        .attr('stroke-width', 5)
        .selectAll('legend')
        .data(edgeLegend).enter()
        .append('rect')
          .attr('x', 25)
          .attr('y', (d, i) => 25 * i + 25)
          .attr('width', 25)
          .attr('height', 6)
          .attr('rx', 3)
          .attr('ry', 3)
          .style('fill', d => color(d.color))

        legend.selectAll('legend-labels')
        .data(edgeLegend).enter()
        .append('text')
          .attr('x', 70)
          .attr('y', (d, i) => 25 * i + 25)
          .text(d => d.type)
          .style('fill', d => color(d.color))
          .style('font-size', '15px')
          .attr("alignment-baseline","middle")
      }
    }

    function arrayToPairs(list) {
      let pairs = [];
      for (let i = 0; i < list.length - 1; i++) {
        pairs.push([list[i], list[i + 1]])
      }
      return pairs
    }

    function unique2DArray(arr) {
      const seen = new Set();
      arr.forEach((subArr, index, array) => {
        subArr.forEach((item, index, subArray) => subArray[index] = visData.id2entity[item]);
        array[index] = subArr;
      });
      return arr.filter(subArr => {
        const stringifiedSubArr = JSON.stringify(subArr);
        if (!seen.has(stringifiedSubArr)) {
          seen.add(stringifiedSubArr);
          return true;
        }
        return false;
      });
    }

    function aggregateNodes() {
      console.log(nodeToAggregate)
      nodeToAggregate
        .attr("cx", d => aggregationPos[visData.entity2id[d.id]][0])
        .attr("cy", d => aggregationPos[visData.entity2id[d.id]][1])
        .attr('r', 10)
        .attr('stroke', 'green')
      linkToAggregate
        .attr("x2", d => aggregationPos[visData.entity2id[d.target.id]][0])
        .attr("y2", d => aggregationPos[visData.entity2id[d.target.id]][1])
    }

    function deAggregateNodes() {
      nodeToAggregate
        .attr("cx", d => beforeAggregationPos[visData.entity2id[d.id]][0])
        .attr("cy", d => beforeAggregationPos[visData.entity2id[d.id]][1])
        .attr('r', 5)
        .attr('stroke', '0xfff')
      linkToAggregate
        .attr("x2", d => beforeAggregationPos[visData.entity2id[d.target.id]][0])
        .attr("y2", d => beforeAggregationPos[visData.entity2id[d.target.id]][1])
    }

    function isTupleInArray(array, tuple) {
      const hashSet = {};
      for (let i = 0; i < array.length; i++) {
          const key = array[i].join(',');
          hashSet[key] = true;
      }
      const tupleKey = tuple.join(',');
      return hashSet[tupleKey] === true;
    }

    function renderPaths(linkSelection, nodeSelection) {
      const paths = d3.select('#paths')

      paths.append('g')
        .attr('stroke-width', 2)
        .selectAll('line')
        .data(linkSelection)
        .join('line')
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr('stroke', (d) => color(d.color));

      paths.append('g')
        .attr('stroke', '0xfff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodeSelection)
        .join('circle')
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr('r', 4)
    }

    function findPaths(start, end) {
      console.log(start, end)
      const PathForm = new FormData();
      PathForm.append('start', start);
      PathForm.append('end', end);
      PathForm.append('metapath', [9, 10, 6]);
      axios.post('http://127.0.0.1:5000/pathfind', PathForm, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(
        res => {
          let pairs = [];
          for (let item in res.data.path) {
            let metapath = res.data.path[item];
            pairs = pairs.concat(arrayToPairs(metapath));
          }
          pairs = unique2DArray(pairs);
          let node_arr = Array.from(new Set([].concat(...Array.from(res.data.path))))
          // link.attr(
          //   'stroke', 
          //   (d) => isTupleInArray(pairs, [d.source.id, d.target.id]) ? '#ff0000' : color(d.color)
          // )
          let linkToRender = links.filter(
            (d) => 
            isTupleInArray(
              pairs, 
              [d.source.id, d.target.id]
            )
          )
          let nodeToRender = nodes.filter((d) => node_arr.indexOf(parseInt(visData.entity2id[d.id])) !== -1)
          link.attr(
            'stroke-width', 
            (d) => isTupleInArray(pairs, [d.source.id, d.target.id]) ? 5 : 2
          )
          link.attr(
            'stroke-opacity',
            (d) => isTupleInArray(pairs, [d.source.id, d.target.id]) ? 1 : 0.1
          )
          node.attr(
            'stroke',
            (d) => node_arr.indexOf(parseInt(visData.entity2id[d.id])) == -1 ? '0xfff': 'red'
          )
          renderPaths(linkToRender, nodeToRender)
        }
      )
    }
    return {visData, findPaths, aggregateNodes, deAggregateNodes, width, height}
  },
}
</script>
<style>
button {
  height: 20px;
  width: 50px;
}

#svg {
  border: 5px solid;
  border-radius: 10px;
  border-color: rgba(181, 174, 174, 0.801);
}

#legend {
  height: 100%;
}

.aaa {
  color: #56ebd3, #197959, #1be46d, #6e9f23, #bbe272, #2f5672, #8bd0eb, 
      #7f20ac, #9785d7, #4e45a3, #d179f8, #9b1b5c, #f2c8e8, #75435b, 
      #fb0998, #e4659b, #3f16f9, #ea3ffc
}

</style>
