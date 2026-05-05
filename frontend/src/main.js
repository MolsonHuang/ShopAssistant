import Vue from 'vue';
import App from './App';
import { request, API_BASE_URL } from './utils/request';

Vue.config.productionTip = false;
Vue.prototype.$request = request;
Vue.prototype.$apiBaseUrl = API_BASE_URL;

App.mpType = 'app';
const app = new Vue({
  ...App,
});
app.$mount();
