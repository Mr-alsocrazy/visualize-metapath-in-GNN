import { createRouter, createWebHashHistory } from "vue-router";
import UploadFile from "@/views/UploadFile.vue";
import VisualizationVue from "@/views/VisualizationVue.vue";
import EmbeddingVis from "@/views/EmbeddingVis.vue";
import SelectNode from '@/views/SelectNode.vue';

const routes = [
  {
    path: '/', 
    redirect: '/select'
  },
  {
    path: '/home',
    component: UploadFile
  },
  {
    path: '/select',
    component: SelectNode
  },
  {
    path: '/visualization',
    component: VisualizationVue
  },
  {
    path: '/visembedding',
    component: EmbeddingVis
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router