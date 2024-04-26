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
  name: "VisEmbedding",
  setup() {
    let visData = shallowReactive({
      id2entity: Object(),
      id2relation: Object(),
      in_degree: Object(),
      graph: Object(),
      embedding: Object(),
      entity2id: Object(),
    });

    let height = ref(1000)
    let width = ref(1000)

    let svg, graph, legend

    let link = {}, node = {};
    let links = [], nodes = []; //datum
    let edgeLegend = [];
    let category18 = [
      '#56ebd3', '#197959', '#1be46d', '#6e9f23', '#bbe272', '#2f5672', '#8bd0eb', 
      '#7f20ac', '#9785d7', '#4e45a3', '#d179f8', '#9b1b5c', '#f2c8e8', '#75435b', 
      '#fb0998', '#e4659b', '#3f16f9', '#ea3ffc'
    ]

    const color = d3.scaleOrdinal(category18)
    const ZOOM_SIZE = 20
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
      svg = d3.select("#svg")
      svg.attr('viewBox', [0, 0, width.value, height.value])
      graph = svg.append('g')
      legend = d3.select('#legend')
      let nodelist = []
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
      nodes = Object.values(keys).map((name) => ({ 
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

      let legendMap = {}

      // 创建链接
      link = graph.append('g')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 2)
        .selectAll('line')
        .data(links)
        .join('line')
        .attr("x1", (d) => visData.embedding[visData.entity2id[d.source]][0] * ZOOM_SIZE + OFFSETX)
        .attr("y1", (d) => visData.embedding[visData.entity2id[d.source]][1] * ZOOM_SIZE + OFFSETY)
        .attr("x2", (d) => visData.embedding[visData.entity2id[d.target]][0] * ZOOM_SIZE + OFFSETX)
        .attr("y2", (d) => visData.embedding[visData.entity2id[d.target]][1] * ZOOM_SIZE + OFFSETY)
        .attr('class', 'link')
        // .attr("x1", d => d.source.x)
        // .attr("y1", d => d.source.y)
        // .attr("x2", d => d.target.x)
        // .attr("y2", d => d.target.y)
        .attr('stroke', (d) => {
          legendMap[d.type] = d.color
          return color(d.color)
        });

      edgeLegend = Object.entries(legendMap).map(([k, v]) => ({'type': k, 'color': v}))

      // 创建节点
      node = graph.append('g')
        .attr('stroke', '0xfff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr('r', 4)

      svg.call(d3.zoom()
        .extent([[0, 0], [width.value, height.value]])
        .scaleExtent([1, 8])
        .on("zoom", ({transform}) => {
          graph.attr('transform', transform)
          node.attr("r", 4 / transform.k)
          svg.selectAll('.metapath').attr('stroke-width', 5 / transform.k)
          svg.selectAll('.link').attr('stroke-width', 2 / transform.k)
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

    function getEnlargeSize(nodeSelection) {
      let minX = nodeSelection[0].x;
      let minY = nodeSelection[0].y;
      let maxX = nodeSelection[0].x;
      let maxY = nodeSelection[0].y;
      nodeSelection.forEach(node => {
        maxX = Math.max(maxX, node.x);
        maxY = Math.max(maxY, node.y);
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
      })
      return { maxX, maxY, minX, minY }
    }

    function renderPaths(linkSelection, nodeSelection) {
      if (nodeSelection.length === 0) {
        return;
      }
      const paths = d3.select('#paths')

      let { maxX, maxY, minX, minY } = getEnlargeSize(nodeSelection)
      const MULTIPLE_SIZE = Math.min(width.value * 0.9 / (maxX - minX), height.value * 0.9 / (maxY - minY))

      console.log(MULTIPLE_SIZE)
      console.log(maxX, maxY, minX, minY)

      // nodeSelection.forEach(d => {
      //   d.x -= minX
      //   d.y -= minY
      // })

      // +10是为了显示完整节点，不然的话会有半个圆在svg外面，前面*0.9同理
      let calX = (x, calLine) => (calLine ? (x * ZOOM_SIZE + OFFSETX - minX + 10) : (x - minX + 10)) * MULTIPLE_SIZE
      let calY = (y, calLine) => (calLine ? (y * ZOOM_SIZE + OFFSETY - minY + 10) : (y - minY + 10)) * MULTIPLE_SIZE

      paths.append('g')
        .attr('stroke-width', 2)
        .selectAll('line')
        .data(linkSelection)
        .join('line')
        .attr("x1", (d) => calX(visData.embedding[visData.entity2id[d.source]][0], true))
        .attr("y1", (d) => calY(visData.embedding[visData.entity2id[d.source]][1], true))
        .attr("x2", (d) => calX(visData.embedding[visData.entity2id[d.target]][0], true))
        .attr("y2", (d) => calY(visData.embedding[visData.entity2id[d.target]][1], true))
        .attr('stroke', (d) => color(d.color));

      paths.append('g')
        .attr('stroke', '0xfff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodeSelection)
        .join('circle')
        .attr("cx", (d) => calX(d.x, false))
        .attr("cy", (d) => calY(d.y, false))
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
          link.attr('class', 'link')
          let pairs = [];
          for (let item in res.data.path) {
            let metapath = res.data.path[item];
            pairs = pairs.concat(arrayToPairs(metapath));
          }
          pairs = unique2DArray(pairs);
          let node_arr = Array.from(new Set([].concat(...Array.from(res.data.path))))
          let linkToRender = links.filter(
            (d) => 
            isTupleInArray(
              pairs, 
              [d.source, d.target]
            )
          )
          let nodeToRender = nodes.filter((d) => node_arr.indexOf(parseInt(visData.entity2id[d.id])) !== -1)
          link.attr(
            'class',
            (d) => isTupleInArray(pairs, [d.source, d.target]) ? 'metapath': 'link'
          )
          svg.selectAll('.metapath')
            .attr('stroke-width', 5)
            .attr('stroke-opacity', 1)
          svg.selectAll('.link')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.01)
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
#path {
  border: 2 solid;
  border-color: grey;
}
button {
  height: 20px;
  width: 50px;
  z-index: 999;
}
</style>
