import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/main.css';

import installIcon from '@/plugins/installIcon'; // icon 注册
import installRouter from '@/plugins/installRouter'; // 路由注册
import installPiniaPlugin from '@/plugins/installPiniaPlugin'; // Pinia 状态监控
import installFFmpeg from '@/plugins/installFFmpeg'; // ffmpeg 集成

const app = createApp(App);

const pinia = createPinia();
pinia.use(installPiniaPlugin);

app.use(pinia);
app.use(installRouter);
app.use(installIcon);
app.use(installFFmpeg);

app.mount('#app');
