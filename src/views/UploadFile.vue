<template>
  <div style="width: 500px;">
    <el-upload
      class="upload-demo"
      action="#"
      ref="upload"
      :on-preview="HandlePreview"
      :on-remove="HandleRemove"
      :before-remove="beforeRemove"
      :limit="1"
      :on-exceed="HandleExceed"
      :file-list="modelList"
      :http-request="modelHandleFileUpload"
      >
      <i class="el-icon-upload"></i>
      <div class="el-upload__text">
        将文件拖到此处，或 <em>点击选取</em>
      </div>
    </el-upload>
    <el-upload
      class="upload-demo"
      action="#"
      ref="upload"
      :on-preview="HandlePreview"
      :on-remove="HandleRemove"
      :before-remove="beforeRemove"
      :limit="1"
      :on-exceed="HandleExceed"
      :file-list="scriptList"
      :http-request="scriptHandleFileUpload"
      >
      <i class="el-icon-upload"></i>
      <div class="el-upload__text">
        将文件拖到此处，或 <em>点击选取</em>
      </div>
    </el-upload>
  </div>
</template>

<script>
import { ref } from 'vue';
import { ElUpload, ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

export default {
  name: "UploadFile",
  components: {
    ElUpload
  },
  setup() {
    let loading = ref(false)
    let modelList = ref([])
    let scriptList = ref([])

    const HandlePreview = (file) => console.log(file)
    const HandleRemove = (file, fileList) => console.log(file, fileList)
    const HandleExceed = () => ElMessage({
      message: '仅能上传一个文件！', 
      type: 'warning'
    })
    const beforeRemove = (file) => {
      return ElMessageBox.confirm(`确认删除${file.name}？`)
      .then(() => true, () => false)
    }

    const modelHandleFileUpload = (file) => {
      loading.value = true
      let formdata = new FormData()
      formdata.append('file', file.file)
      console.log(formdata)
      axios.post('http://127.0.0.1:5000/upload_model', formdata)
      .then(
        res => console.log(res)
      )
    }

    const scriptHandleFileUpload = (file) => {
      let script_formdata = new FormData()
      script_formdata.append('file', file.file)
      axios.post('http://127.0.0.1:5000/upload_script', script_formdata)
      .then(
        res => console.log(res)
      )
    }

    return {
      loading, modelList, scriptList, 
      HandlePreview, HandleRemove, HandleExceed, 
      beforeRemove, modelHandleFileUpload, scriptHandleFileUpload
    }
  },
};
</script>
