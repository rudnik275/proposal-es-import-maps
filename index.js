import { createApp, h } from 'vue'
// import App from './App.vue'
import {text} from './utils/divText.js'

createApp({ render: () => h('div', text) }).mount('#app')

