<template>
  <div>
    <svg ref="svg" width="1200" height="1200" id="svg"></svg>
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
import { onMounted, shallowReactive } from 'vue';
import axios from 'axios';
import * as d3 from 'd3';

export default {
  name: "VisualizationVue",
  setup() {
    let visData = shallowReactive({
      id2entity: Object(),
      id2relation: Object(),
      in_degree: Object(),
      graph: Object(),
      embedding: Object(),
      entity2id: Object(),
    });

    let link = {}, node = {};
    let category18 = [
      '#56ebd3', '#197959', '#1be46d', '#6e9f23', '#bbe272', '#2f5672', '#8bd0eb', 
      '#7f20ac', '#9785d7', '#4e45a3', '#d179f8', '#9b1b5c', '#f2c8e8', '#75435b', 
      '#fb0998', '#e4659b', '#3f16f9', '#ea3ffc'
    ]

    const color = d3.scaleOrdinal(category18)
    const ZOOM_SIZE = 10
    let OFFSETX = 0, OFFSETY = 0

    onMounted(() => {
      axios.get('http://127.0.0.1:5000/vis')
      .then(
        res => {
          visData.id2entity = res.data.id2entity;
          visData.id2relation = res.data.id2relation;
          visData.graph = JSON.parse(res.data.graph);
          visData.in_degree = JSON.parse(res.data.in_degree);
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
      let links=[], nodelist = []
      for (let n in visData.graph) {
        nodelist.push(n)
        visData.graph[n].forEach(neighbor => {
          links.push({
            source: visData.id2entity[n], 
            type: visData.id2relation[neighbor[0]], 
            target: visData.id2entity[neighbor[1]],
            color: neighbor[0]
          })
          nodelist.push(neighbor[1])
        });
      }
      nodelist = Array.from(new Set(nodelist.map(x => parseInt(x))))

      // 将nodes中的id从代号转换为实体名称
      let keys = nodelist.map(id => visData.id2entity[id])
      let nodes = Object.values(keys).map((name) => ({ 
        id: name,
        x: visData.embedding[visData.entity2id[name]][0] * ZOOM_SIZE,
        y: visData.embedding[visData.entity2id[name]][1] * ZOOM_SIZE
      }));

      nodes.forEach(v => {
        OFFSETX = v.x < OFFSETX ? v.x : OFFSETX;
        OFFSETY = v.y < OFFSETY ? v.y : OFFSETY;
      })
      OFFSETX = -OFFSETX;
      OFFSETY = -OFFSETY;
      nodes.forEach(v => {
        v.x += OFFSETX;
        v.y += OFFSETY;
      })

      // 更新布局
      // let simulation = d3.forceSimulation(nodes)
      //   .force("link", d3.forceLink(links).id(d => d.id))
      //   .force("charge", d3.forceManyBody())
      //   .force("center", d3.forceCenter(600, 600))
      //   .force("x", d3.forceX())
      //   .force("y", d3.forceY())
      //   .stop();

      // simulation.tick(Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())))

      // 创建链接
      link = svg.append('g')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 2)
        .selectAll('line')
        .data(links)
        .join('line')
        .attr("x1", (d) => visData.embedding[visData.entity2id[d.source]][0] * ZOOM_SIZE + OFFSETX)
        .attr("y1", (d) => visData.embedding[visData.entity2id[d.source]][1] * ZOOM_SIZE + OFFSETY)
        .attr("x2", (d) => visData.embedding[visData.entity2id[d.target]][0] * ZOOM_SIZE + OFFSETX)
        .attr("y2", (d) => visData.embedding[visData.entity2id[d.target]][1] * ZOOM_SIZE + OFFSETY)
        // .attr("x1", d => d.source.x)
        // .attr("y1", d => d.source.y)
        // .attr("x2", d => d.target.x)
        // .attr("y2", d => d.target.y)
        .attr('stroke', (d) => color(d.color))

      console.log(link)

      // 创建节点
      node = svg.append('g')
        .attr('stroke', '0xfff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr('r', 4)

      // let text = svg.append('g')
      //   .attr('fill', 'black')
      //   .selectAll('.nodetext')
      //   .data(nodes)
      //   .join('text')
      //   .attr('dx', d => d.x - 5)
      //   .attr('dy', d => d.y - 4)
      //   .attr('class', 'nodetext')
      //   .text(d => d.id)
      //   .attr('font-size', 7);

      // node.append('title').text(d => d.id)

      console.log(node)

      // let relationLabel = svg.append('g')
      //   .attr('fill', 'black')
      //   .selectAll('.linklabel')
      //   .data(links)
      //   .join('text')
      //   .attr('class', 'linklabel')
      //   .attr('dx', d => (d.source.x + d.target.x) / 2)
      //   .attr('dy', d => (d.source.y + d.target.y) / 2)
      //   .text(d => d.type)
      //   .attr('font-size', 7);
      svg.call(d3.zoom()
      .on('zoom', e => {
        let transform = e.transform
        svg.attr('transform', transform)
        node.attr('r', 4 / transform.k)
        link.attr('stroke-width', 2 / transform.k)
      })
      .extent([[0, 0], [1200, 1200]])
      .translateExtent([[0, 0], [1200, 1200]])
      .scaleExtent([1, 8]))
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
      node.style(
        'visibility', 
        (d) => (visData.in_degree[visData.entity2id[d.id]] > 1) 
        || (visData.graph[visData.entity2id[d.id]] !== undefined) 
        ? 'visible' : 'hidden'
      )
      link.style(
        'visibility',
        (d) => (visData.in_degree[visData.entity2id[d.target]] > 1) 
          || (visData.graph[visData.entity2id[d.target]] !== undefined) 
          ? 'visible' : 'hidden'
      )
    }

    function deAggregateNodes() {
      node.style('visibility', 'visible')
      link.style('visibility', 'visible')
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
          link.attr(
            'stroke-width', 
            (d) => isTupleInArray(pairs, [d.source, d.target]) ? 5 : 2
          )
          link.attr(
            'stroke-opacity',
            (d) => isTupleInArray(pairs, [d.source, d.target]) ? 1 : 0.01
          )
          // link.filter(
          //   d => console.log(isTupleInArray(pairs, [d.source, d.target]))
          // )
          node.attr(
            'stroke',
            (d) => node_arr.indexOf(parseInt(visData.entity2id[d.id])) == -1 ? '0xfff': 'red'
          )
        }
      )
    }
    return {visData, findPaths, aggregateNodes, deAggregateNodes}
  },
}
</script>
<style>
button {
  height: 20px;
  width: 50px;
  z-index: 999;
}

.link {
  stroke: 0x999;
  stroke-opacity: 0.6;
}

.node {
  fill: 0xccc;
  stroke: 0xfff;
  stroke-width: 1.5px;
}

.node text {
  pointer-events: none;
  font: 10px sans-serif;
}

.relation {
  font: 8px sans-serif;
}

</style>
