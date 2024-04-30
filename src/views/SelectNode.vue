<template>
  <div>
    <el-row>
      <el-col :span="12" justify="start">
        <div id="container"/>
      </el-col>
      <el-col :span="12" justify="start">
        <el-row id="filter mb-4" v-show="isDataLoaded">
          <el-col :span="24">
            <svg id="hist-container" :height="1000" :width="928"></svg>
          </el-col>
          <el-col :span="12">
            <el-button type="primary" @click="filter_nodes" text>Filter Nodes</el-button>
          </el-col>
          <el-col :span="12">
            <el-button type="primary" @click="cancel_selection" text>Cancel Selection</el-button>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
  </div>
</template>
<script>
import { onMounted, ref, shallowReactive, reactive } from 'vue'
import axios from 'axios'
import Konva from 'konva'
import * as d3 from 'd3'

export default {
  name: "SelectNode",
  setup() {
    let visData = shallowReactive({
      id2entity: Object(),
      id2relation: Object(),
      embedding: Object(),
      edge_type_count: Object(),
    })

    let nodesToRender = []

    let stage = shallowReactive({
      stage: null
    })

    let isDataLoaded = ref(false)
    let height = ref(1200)
    let width = ref(1200)

    let barSVGWidth = ref(1000)
    let barSVGHeight = ref(1000)

    let selectFilter = reactive({
      selectedCircle: new Array(),
      selectedLabel: new Array()
    })

    let relation2id = Object()

    let category18 = [
      '#56ebd3', '#197959', '#1be46d', '#6e9f23', '#bbe272', '#2f5672', '#8bd0eb', 
      '#7f20ac', '#9785d7', '#4e45a3', '#d179f8', '#9b1b5c', '#f2c8e8', '#75435b', 
      '#fb0998', '#e4659b', '#3f16f9', '#ea3ffc'
    ]

    const color = d3.scaleOrdinal(category18)

    onMounted(() => {
      axios.get('http://127.0.0.1:5000/select')
      .then(
        res => {
          visData.id2entity = res.data.id2entity
          visData.id2relation = res.data.id2relation
          visData.embedding = res.data.embedding
          visData.edge_type_count = res.data.edge_type_count
          visData.edge_type_count = Object.entries(visData.edge_type_count).map(([k, v]) => ({'type': k, 'frequency': v}))

          relation2id = Object.fromEntries(Object.entries(visData.id2relation).map(([k, v]) => ([v, k])))

          isDataLoaded.value = true

          init()
        }
      )
    })

    function circleOnClick() {
      let id = this.id()
      if (selectFilter.selectedCircle.includes(id)) {
        selectFilter.selectedCircle = selectFilter.selectedCircle.filter(idToKeep => idToKeep !== id)
        this.fill('red')
      } else {
        selectFilter.selectedCircle.push(id)
        this.fill('blue')
      }
    }

    function init() {
      stage = new Konva.Stage({
        container: 'container',
        width: width.value,
        height: height.value,
      })

      let layer = new Konva.Layer({
        draggable: true
      })

      visData.embedding.forEach((v, i) => {
        let circle = new Konva.Circle({
          x: v[0] * 20 + stage.width() / 2,
          y: v[1] * 20 + stage.height() / 2,
          radius: 5,
          fill: 'red',
          stroke: 'black',
          strokeWidth: 1,
          scaleX: 1,
          scaleY: 1,
          id: i
        })
        circle.on('click', circleOnClick)
        layer.add(circle)
      })

      stage.add(layer)

      let scaleBy = 1.1
      stage.on('wheel', (e) => {
        e.evt.preventDefault()
        let oldScale = stage.scaleX()
        let pointer = stage.getPointerPosition()
        let mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        }
        let direction = e.evt.deltaY < 0 ? 1 : -1
        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
        stage.scale({ x: newScale, y: newScale })
        let newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        }
        stage.position(newPos)

        stage.find('Circle').forEach(c => c.scale({
          x: c.scaleX() * (oldScale / newScale),
          y: c.scaleY() * (oldScale / newScale)
        }))
      })

      drawBarChart()
    }

    function nodesReRender() {
      stage.removeChildren()
      let layer = new Konva.Layer({
        draggable: true
      })

      nodesToRender.forEach((v, i) => {
        let circle = new Konva.Circle({
          x: visData.embedding[v][0] * 20 + stage.width() / 2,
          y: visData.embedding[v][1] * 20 + stage.height() / 2,
          radius: 5,
          fill: 'red',
          stroke: 'black',
          strokeWidth: 1,
          scaleX: 1,
          scaleY: 1,
          id: i
        })
        circle.on('click', circleOnClick)
        layer.add(circle)
      })

      stage.add(layer)
    }

    function drawBarChart(){
      const barHeight = 25
      const marginTop = 30
      const marginRight = 0
      const marginBottom = 10
      const marginLeft = 150
      const width = 928
      const height = Math.ceil((visData.edge_type_count.length + 0.1) * barHeight) + marginTop + marginBottom
      barSVGHeight.value = height
      barSVGWidth.value = width

      let svg = d3.select('#hist-container')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

      const x = d3.scaleLinear()
        .domain([0, d3.max(visData.edge_type_count, d => d.frequency)])
        .range([marginLeft, width - marginRight]);
    
      const y = d3.scaleBand()
        .domain(d3.sort(visData.edge_type_count, d => d.type).map(d => visData.id2relation[d.type]))
        .rangeRound([marginTop, height - marginBottom])
        .padding(0.1);

      svg.append("g")
        .selectAll()
        .data(visData.edge_type_count)
        .join("rect")
          .attr("x", x(0))
          .attr("y", (d) => y(visData.id2relation[d.type]))
          .attr("width", (d) => x(d.frequency) - x(0))
          .attr("height", y.bandwidth())
          .style('fill', d => color(d.type))
      
      svg.append("g")
        .attr("fill", "white")
        .attr("text-anchor", "end")
      .selectAll()
      .data(visData.edge_type_count)
      .join("text")
        .attr("x", (d) => x(d.frequency))
        .attr("y", (d) => y(visData.id2relation[d.type]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .text((d) => d.frequency)
      .call((text) => text.filter(d => x(d.frequency) - x(0) < 40) // short bars
        .attr("dx", +4)
        .attr("fill", "black")
        .attr("text-anchor", "start"))

      svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)
        .call(d3.axisTop(x))
        .call(g => g.select(".domain").remove())

      svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).tickSizeOuter(0))
      .selectAll('.tick text')
        .style('fill', 'black')
        .on('click', function() {
          let labelId = relation2id[d3.select(this).text()]
          if (selectFilter.selectedLabel.includes(labelId)) {
            selectFilter.selectedLabel = selectFilter.selectedLabel.filter(idToKeep => idToKeep !== labelId)
            d3.select(this).style('fill', 'black')
          } else {
            selectFilter.selectedLabel.push(labelId)
            d3.select(this).style('fill', 'red')
          }
          console.log(selectFilter.selectedLabel)
        })
    }

    function filter_nodes() {
      let selectCircleLength = selectFilter.selectedCircle.length
      let selectedLabelLength = selectFilter.selectedLabel.length
      if (selectCircleLength === 0 && selectedLabelLength === 0) {
        init()
      } else if (selectedLabelLength === 0) {
        nodesToRender = Array.from(selectFilter.selectedCircle)
        nodesReRender()
      } else {
        let selectedLabelForm = new FormData()
        selectedLabelForm.append('filter_links', Array.from(selectFilter.selectedLabel))
        let selectedNodesByLabel = []

        axios.post('http://127.0.0.1:5000/filter_by_link_type', selectedLabelForm, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then(
          res => {
            selectedNodesByLabel = res.data.filtered_index

            if (selectCircleLength !== 0) {
              let _selectedCircleSets = new Set(selectFilter.selectedCircle)
              let _selectedLabelSets = new Set(selectedNodesByLabel)
              nodesToRender = Array.from(
                new Set(
                  [..._selectedLabelSets].filter(value => _selectedCircleSets.has(value))
                )
              )
            } else {
              nodesToRender = selectedNodesByLabel
            }
            console.log(nodesToRender)
            nodesReRender()
          }
        )
      }
    }
    
    function cancel_selection() {
      init()
    }

    return { 
      width, 
      height, 
      isDataLoaded, 
      visData, 
      selectFilter, 
      barSVGHeight, 
      barSVGWidth, 
      filter_nodes, 
      cancel_selection 
    }
  },
}
</script>
<style scoped>
#container {
  border: 5px solid;
  border-color: grey;
  width: 1200px;
  height: 1200px;
}

#filter {
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-content: flex-start;
}
</style>