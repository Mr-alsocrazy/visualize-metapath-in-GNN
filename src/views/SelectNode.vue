<template>
  <div id="container"/>
</template>
<script>
import { onMounted, ref, shallowReactive } from 'vue'
import axios from 'axios'
import Konva from 'konva'

export default {
  name: "SelectNode",
  setup() {
    let visData = shallowReactive({
      id2entity: Object(),
      id2relation: Object(),
      embedding: Object()
    })

    let stage = shallowReactive({
      stage: null
    })

    let height = ref(1200)
    let width = ref(1200)

    onMounted(() => {
      axios.get('http://127.0.0.1:5000/select')
      .then(
        res => {
          visData.id2entity = res.data.id2entity
          visData.id2relation = res.data.id2relation
          visData.embedding = res.data.embedding
          init()
        }
      )
    })

    function init() {
      stage = new Konva.Stage({
        container: 'container',
        width: width.value,
        height: height.value,
      })

      let layer = new Konva.Layer({
        draggable: true
      })

      visData.embedding.forEach((v, a, i) => {
        layer.add(new Konva.Circle({
          x: v[0] * 20 + stage.width() / 2,
          y: v[1] * 20 + stage.height() / 2,
          radius: 5,
          fill: 'red',
          stroke: 'black',
          strokeWidth: 1,
          scaleX: 1,
          scaleY: 1,
          id: i
        }))
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
    }
    return { width, height }
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
</style>