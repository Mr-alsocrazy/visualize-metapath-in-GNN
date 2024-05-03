<template>
  <div>
    <el-row>
      <el-col :span="12" justify="start">
        <div id="container"/>
      </el-col>
      <el-col :span="12" justify="start">
        <el-row id="filter mb-4" v-show="isDataLoaded">
          <el-col :span="24">
            <svg id="hist-container" :height="barSVGHeight" :width="barSVGWidth"></svg>
          </el-col>
          <el-col :span="12" :offset="6">
            <el-slider class="slider" 
            v-model="pagerank_value" 
            range 
            :step="0.0001" 
            
            :min="pagerank_min"
            :max="pagerank_max"
            />
          </el-col>
          <el-col :span="12" :offset="6">
            <el-slider 
            class="slider" 
            v-model="degree_centrality_value" 
            range 
            :step="0.0001" 
            
            :min="degree_centrality_min"
            :max="degree_centrality_max"
            />
          </el-col>
          <el-col :span="8">
            <el-button type="primary" @click="filter_nodes" text>Filter Nodes</el-button>
          </el-col>
          <el-col :span="8">
            <el-button type="primary" @click="cancel_selection" text>Cancel Selection</el-button>
          </el-col>
          <el-col :span="8">
            <el-button type="primary" @click="select_nodes" text>Select Nodes</el-button>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
  </div>
</template>
<script>
import { onMounted, ref, shallowReactive, reactive } from 'vue'
import { useRouter } from 'vue-router'
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
      pagerank: Object(),
      degree_centrality: Object()
    })

    const router = useRouter()

    let nodesToRender = []

    let stage = shallowReactive({
      stage: null
    })

    let isDataLoaded = ref(false)
    let height = ref(1200)
    let width = ref(1200)

    let barSVGWidth = ref(1000)
    let barSVGHeight = ref(1000)

    let pagerank_value = ref([0, 1])
    let pagerank_min = ref(0)
    let pagerank_max = ref(1)

    let degree_centrality_value = ref([0, 1])
    let degree_centrality_min = ref(0)
    let degree_centrality_max = ref(1)

    let selectFilter = reactive({
      selectedCircle: new Array(),
      selectedLabel: new Array(),
      selectedNodeByPR: new Array(),
      selectedNodeByDC: new Array()
    })

    let _DECIMAL_EQUAL = (a, b) => Math.abs(a - b) < 1e-8
    let _IN_RANGE = (x, R) => x <= R[1] && x >= R[0]

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
          visData.pagerank = res.data.pagerank
          visData.degree_centrality = res.data.degree_centrality
          pagerank_min.value = res.data.pagerank_min
          pagerank_max.value = res.data.pagerank_max
          degree_centrality_min.value = res.data.degree_centrality_min
          degree_centrality_max.value = res.data.degree_centrality_max

          console.log(visData)

          visData.edge_type_count = Object.entries(visData.edge_type_count).map(
            ([k, v]) => ({'type': k, 'frequency': v})
          )
          // visData.pagerank = Object.entries(visData.pagerank).map(
          //   ([k, v]) => ({'node': k, 'pagerank': v})
          // )
          // visData.degree_centrality = Object.entries(visData.degree_centrality).map(
          //   ([k, v]) => ({'node': k, 'degree_centrality': v})
          // )

          relation2id = Object.fromEntries(Object.entries(visData.id2relation).map(([k, v]) => ([v, k])))
          pagerank_value.value = [pagerank_min.value, pagerank_max.value]
          degree_centrality_value.value = [degree_centrality_min.value, degree_centrality_max.value]

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

      nodesToRender.forEach((v) => {
        let circle = new Konva.Circle({
          x: visData.embedding[v][0] * 20 + stage.width() / 2,
          y: visData.embedding[v][1] * 20 + stage.height() / 2,
          radius: 5,
          fill: 'red',
          stroke: 'black',
          strokeWidth: 1,
          scaleX: 1,
          scaleY: 1,
          id: v
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
        // .call(g => g.select(".domain").remove())

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

    function filter_nodes_pagerank(filtered_already = true) {
      if (!_DECIMAL_EQUAL(pagerank_value.value[0], pagerank_min) 
      || !_DECIMAL_EQUAL(pagerank_value.value[1], pagerank_max)) {
        visData.pagerank.forEach(v => {
          if (_IN_RANGE(v['pagerank'], pagerank_value.value)) {
            selectFilter.selectedNodeByPR.push(v['node'])
          }
        })
        if (filtered_already) {
          let _selectedPRSets = new Set(selectFilter.selectedNodeByPR)
          let _nodesToRenderSets = new Set(nodesToRender)
          nodesToRender = Array.from(
            new Set(
              [..._selectedPRSets].filter(value => _nodesToRenderSets.has(value))
            )
          )
        } else {
          nodesToRender = Array.from(selectFilter.selectedNodeByPR)
        }
      }
    }

    function filter_nodes_degree_cetrality(filtered_already = true) {
      if (!_DECIMAL_EQUAL(degree_centrality_value.value[0], degree_centrality_min)
      || !_DECIMAL_EQUAL(degree_centrality_value.value[1], degree_centrality_max)) {
        visData.degree_centrality.forEach(v => {
          if (_IN_RANGE(v['degree_centrality'], degree_centrality_value.value)) {
            selectFilter.selectedNodeByDC.push(v['node'])
          }
        })
        if (filtered_already) {
          let _selectedDCSets = new Set(selectFilter.selectedNodeByDC)
          let _nodesToRenderSets = new Set(nodesToRender)
          nodesToRender = Array.from(
            new Set(
              [..._selectedDCSets].filter(value => _nodesToRenderSets.has(value))
            )
          )
        } else {
          nodesToRender = Array.from(selectFilter.selectedNodeByDC)
        }
      }
    }

    function filter_nodes() {
      selectFilter.selectedNodeByPR = []
      selectFilter.selectedNodeByDC = []
      let selectedCircleLength = selectFilter.selectedCircle.length
      let selectedLabelLength = selectFilter.selectedLabel.length
      if (selectedCircleLength === 0 && selectedLabelLength === 0) {
        filter_nodes_pagerank(false)
        filter_nodes_degree_cetrality()
        nodesReRender()
      } else if (selectedLabelLength === 0) {
        nodesToRender = Array.from(selectFilter.selectedCircle)
        filter_nodes_pagerank()
        filter_nodes_degree_cetrality()
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
            console.log(selectFilter)
            console.log(selectedNodesByLabel)

            let _selectedCircleSets = new Set(selectFilter.selectedCircle)
            let _selectedLabelSets = new Set(selectedNodesByLabel)

            if (selectedCircleLength !== 0) {
              nodesToRender = Array.from(
                new Set(
                  [..._selectedLabelSets].filter(value => _selectedCircleSets.has(value))
                )
              )
            } else {
              nodesToRender = Array.from(selectedNodesByLabel)
            }
            
            filter_nodes_pagerank()
            filter_nodes_degree_cetrality()

            console.log(nodesToRender)
            nodesReRender()
          }
        )
      }
    }
    
    function cancel_selection() {
      init()
      nodesToRender = []
      selectFilter.selectedCircle = []
      selectFilter.selectedLabel = []
      selectFilter.selectedNodeByPR = []
      selectFilter.selectedNodeByDC = []
    }

    function select_nodes() {
      let selectNodesForm = new FormData()
      selectNodesForm.append('selection', nodesToRender)
      axios.post('http://127.0.0.1:5000/selection', selectNodesForm, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(
        res => {
          if (res.data.message === 200) {
            router.push('/visembedding')
          }
        }
      )
    }

    return { 
      width, 
      height, 
      isDataLoaded, 
      visData, 
      selectFilter, 
      barSVGHeight, 
      barSVGWidth,
      pagerank_value,
      pagerank_min,
      pagerank_max,
      degree_centrality_value,
      degree_centrality_min,
      degree_centrality_max,
      filter_nodes, 
      cancel_selection,
      select_nodes
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

.slider {
  max-width: 600px;
}
</style>