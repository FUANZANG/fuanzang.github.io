# Vue Note

## unplugin-auto-import 自动引入

+ 支持vue, vue-router, vue-i18n, @vueuse/head, @vueuse/core等自动引入
+ 安装 `npm i -D unplugin-auto-import`
+ 配置

  ```js
  // vite.config.ts
  import { defineConfig } from 'vite'
  import AutoImport from 'unplugin-auto-import/vite'

  export default defineConfig({
    plugins: [
      AutoImport({
        imports: ['vue', 'vue-router', 'vue-i18n', '@vueuse/head', '@vueuse/core'],
        // auto-import.d.ts 生成的位置 (默认是在根目录)
        dts: 'src/type/auto-import.d.ts',
      })
    ]
  })
  ```

## unplugin-vue-define-options 配置name

+ Vue3 中配置组件的name 3.3版本支持了defineOptions 不需要额外安装插件
+ 安装 `npm install unplugin-vue-define-options -D`
+ 配置

  ```js
  //vite.config.ts
  import { defineConfig } from 'vite';
  import vue from '@vitejs/plugin-vue';
  import defineOptions from 'unplugin-vue-define-options/dist/vite';

  export default defineConfig({
    plugins: [vue(), defineOptions()],
  });
  ```

+ TS支持

  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      // ...
      "types": ["unplugin-vue-define-options/macros-global" /* ... */]
    }
  }
  ```

+ 使用

  ```js
  <script lang="ts" setup>
    defineOptions({
      name: 'YourName',
    });
  </script>
  ```

## vite-plugin-vue-setup-extend 配置name

+ vue3 中另外一种name定义方式，直接写在script标签上
+ 安装 `npm i vite-plugin-vue-setup-extend -D`
+ 配置

  ```js
  // vite.config.ts
  import vueSetupExtend from 'vite-plugin-vue-setup-extend'

  export default defineConfig({
    plugins: [vue(), vueSetupExtend()],
  })
  ```

+ 使用

  ```js
  <script lang="ts" setup name="App">
    // script 里面必须有东西 哪怕是一个注释都行
  </script>
  ```

## pinia-plugin-persist 持久化

+ [Pinia持久化插件](https://seb-l.github.io/pinia-plugin-persist/#vue3)

## 组件的二次封装

+ 需要考虑原有组件的
  + **属性与事件** 通过$attrs获取然后传递
  + **插槽** 通过$slots获取传递的插槽然后遍历传递
  + **ref** 不推荐传递ref 如果非要传递的话只能将要封装的组件的ref暴露出去然后挂载到封装组件的实例上

  ```vue
  <!-- 自己封装的组件 MyInput -->
  <template>
    <div class="my-input">
      <!-- 处理单独的value以外 将原有的属性和事件传递给原生组件 -->
      <el-input v-bind="$attrs" ref="getRef">
        <!-- 组件的作用域插槽问题需要向外传递数据 而且插槽使用情况不一定 需要遍历传递过去 -->
        <template v-for="(slot, name) in $slots" #[name]="scopeData">
          <!-- 将插槽数据传递给插槽 -->
          <slot :name="name" v-bind="scopeData || {}"></slot>
        </template>
      </el-input>
    </div>
  </template>

  <script>
  export default {
    props: ['modelValue'],
    created(){
      // 没在props接收的值都在 $attrs 中
      console.log(this.$attrs)
      // 外部使用组件所传递的插槽都在 $slots 中
      console.log(this.$slots)
    },
    mounted(){
      // 获取封装组件的ref 然后挂载到当前组件的实例上
      const getRef = this.$refs.getRef
      for(const key in getRef){
        this[key] = getRef[key]
      }
    }
  }
  </script>

  <!-- 使用二次封装的组件 useMyInput -->
  <template>
    <MyInput v-model='val'>
      <!-- 在二次封装的组件中使用插槽 -->
      <template #prepend>
        <el-select>
          <el-option label="1" value="1" />
          <el-option label="2" value="3" />
        </el-select>
      </template>
    </MyInput>
  </template>

  ```

## 封装组件的 v-model 传递问题

+ v-model的原理
  + v-model本质上是一个语法糖，它背后其实包含两个操作：
    + v-bind 绑定一个属性
    + v-on 监听一个事件
  + 对于input元素，v-model会自动绑定value和input事件，v-model 在原生 input 上等价于 :value + @input 的语法糖
  + vue3的 v-model 是modelValue 和 update:modelValue 两个属性，modelValue 用于绑定数据，update:modelValue 用于监听数据变化并更新视图

+ 对于v-model 的修改 由于要保证单向数据流 本质上是使用的 computed来处理 modelValue 和 update:modelValue

  ```js
  // 封装一个 useVModel.js
  import { computed } from 'vue'
  // 创建一个WeakMap 他是弱引用 如果没有其他引用指向这个对象 垃圾回收会回收他
  const cacheMap = new WeakMap()

  export function useVModel(props, propName, emit){
    return computed({
      get(){
        // 使用 WeakMap 来缓存已处理的 props[propName]，以避免重复创建代理
        if (cacheMap.has(props[propName])){
          return cacheMap.get(props[propName])
        }
        // 如果没有缓存，创建一个新代理对象。该代理用于拦截对 props[propName] 的访问和修改
        const proxy = new Proxy(props[propName], {
          get(target, key){
            return Reflect.get(target, key)
          },
          set(target, key, value){
            emit('update:' + propName, {
              ...target,
              [key]: value
            })
            return true
          }
        })
        // 将创建的代理存入 cacheMap 中，以便后续使用
        cacheMap.set(props[propName], proxy)
        return proxy
      },
      set(val){
        emit('update:' + propName, val)
      }
    })
  }
  ```

<!-- 以下内容从 javascript-note.md 迁移 -->

## Vue3

### 通讯方式

+ 组件传值
  + 父传子：父组件通过冒号绑定，子组件通过 `const props = defineProps({xxx:{type: xxx,default: xxx}})` 接收 然后通过props.xxx使用

    ```vue
      <!-- 父组件 --> 
      <template>
        <child :name="name"></child>
      </template>

      <script setup>
      import { ref } from 'vue'
      import child from './child.vue'

      const name = ref('天天鸭')
      </script>
      <!-- 子组件 -->
      <template>
        <div>{{ props.name }}</div>
      </template>

      <script setup>
      import { defineProps } from 'vue'
      const props = defineProps({
        name: {
          type: String,
          default: '',
        },
      })
      </script>
    ```

  + 子传父：子组件用 `const emits = defineEmits(['触发的方法'])` 注册某个在父组件的事件 然后通过emits('触发的事件',参数) 触发父组件事件并且带上参数

      ```vue
      <!-- 子组件 -->
      <template>
        <div ></div>
      </template>

      <script setup>
      import { ref, defineEmits } from 'vue'

      const name = ref('天天鸭')
      const emits = defineEmits(['addEvent'])
      const handleSubmit = () => {
        emits('addEvent', name.value)
      }
      </script>
      <!-- 父组件 -->
      <template>
        <child @addEvent="handle"></child>
      </template>

      <script setup>
      import { ref } from 'vue'
      import child from './child.vue'

      const handle = value => {
        console.log(value); // '天天鸭'
      }
      </script>
      ```
  
  + 兄弟传值：vue2 是`EventBus`事件总线跨组件实现 vue3使用的是`mitt.js`插件实现
    + 引入：npm install --save mitt
    + 在main.js文件进行全局挂载, $bus是自定义属性名
      import mitt from "mitt"
      const app = createApp(App)
      app.config.globalProperties.$bus = new mitt()
    + 传参出去的使用方法
      import mitt from 'mitt'
      const emitter = new mitt()
      emitter.emit('自定义的事件名称','参数')
    + 接收参数的使用方法（注意：emit和on必须使用同一个mitt实例，实际项目中应通过全局挂载或共享模块导出同一实例）
      emitter.on('自定义的事件名称', (data) => { console.log(data) })

  + `$attrs` 在vue2中除了`$attrs`，还有`$listeners`；但vue3直接把`$listeners`合并到 `$attrs` 里面了
    + `$attrs`主要作用是接收没在props里面定义，但父组件又传了过来的属性
      import { defineProps, useAttrs } from 'vue'
      const myAttrs = useAttrs() 接收没在 props 里的值
  
  + `refs` 传参: 父组件通过在子组件上定义 ref='ref名称'，然后const ref名称 = ref(null)，就能通过ref名称操控子组件的属性和方法（子组件用defineExpose对外暴露才能被操控）

    ```vue
    <!-- 父组件代码 -->
    <template>
      <child ref="myref"></child>
      <button @click="myClick">点击</button>
    </template>

    <script setup>
      import child from "./child.vue"
      import { ref } from "vue"
      const myref = ref(null)
      const myClick = () => {
        console.log(myref.value.name) // 直接获取到子组件的属性
        myref.value.chileMethod()      // 直接调用子组件的方法
      }
    </script>

    <!-- 子组件代码 用defineExpose对外暴露才能被操控 -->
    <template>
      <div></div>
    </template>

    <script setup>
      import { defineExpose } from "vue"

      const chileMethod = () =>{
        console.log("我是方法")
      }
      const name = ref('天天鸭')

      defineExpose({    // 对外暴露
        name,
        chileMethod
      })
    </script>
    ```

  + v-model 其实是语法糖，如下两行代码作用是一样, 上面是下面的简写
    `<child v-model:title="title" />`
    `<child :title="title" @update:title="title = $event" />`

    ```vue
    <!-- 父组件：直接使用v-model传参 -->
    <template>
      <child v-model:name="name" v-model:num="num"></child>
    </template>

    <script setup>
      import child from "./child.vue"
      import { ref, reactive } from "vue"
      const name = ref("天天鸭")
      const num = ref("2222")
    </script>

    <!-- 子组件：通过 defineEmits获取到然后用emit("update:修改的属性", 修改的内容)进行修改父组件的内容 -->
    <template>
      <button @click="myClick">点击</button>
    </template>

    <script setup>
      import { defineEmits } from "vue"
      const emit = defineEmits(["name","num"])
      
      // 子组件触发使用
      const myClick = () => {
        emit("update:name", "改个新名字")
        emit("update:num", "换个新号码")
      }
    </script>
    ```

    + `defineModel()宏`的简单说明：父子组件的数据双向绑定，不用emit和props的繁重代码，版本要求：必须要3.4+

    ```vue
    <!-- 实例 -->
    <!-- 父组件代码： 用v-model在子组件身上绑定showDevice属性，该属性用于通知子组件是否打开弹窗。 -->
    <template>
      <child v-if="showDevice" v-model="showDevice"></child>
    </template>

    <script setup>
        import child from "./child.vue"
        import { ref } from "vue"

        const showDevice = ref(false) // 控制子组件的显示和隐藏
    </script>

    <!-- 子组件代码： 如下的handleClickCancel方法，通过defineModel宏声明一个model，点击按钮能直接通知父组件修改属性。 -->
    <template>
    <button @click="handleClickCancel">点击取消子组件弹窗</button>
    </template>

    <script setup>
      import { defineModel } from 'vue'
      const model = defineModel()                       // 写法一
      // const model = defineModel({ type: Boolean })   // 写法二 也可以用声明类型的方法

      const handleClickCancel = () => {
        model.value = false
      }
    </script>
    ```
  
  + provide/inject 依赖注入 可以实现多层组件传递数据
    + 祖组件
      import { ref, provide } from 'vue';
      const name = ref('天天鸭');
      provide('name', name)
    + 孙组件
      import { inject } from 'vue'
      const name = inject('name')

  + 路由传参
    + `query` 传参

    ```js
    // 传递方
    const query = { id: 9527, name: '天天鸭' }
    router.push({ path: '/user', query })

    // 接收方
    import { useRoute} from 'vue-router'
    const route = useRoute()
    console.log(route.query) 
    ```

    + `params` 传参 **4.1.4 (2022-08-22) 删除了param这种方式** ~~（已废弃，以下代码仅供参考）~~

    ```js
    // 传递方（已废弃：vue-router 4.x 已移除 params 传参方式）
    // router.push({ name: 'user', params: { id: 9527, name: '天天鸭' } })
    
    // 接收方
    // import { useRoute } from 'vue-router'
    // const route = useRoute()
    // console.log(route.params)
    ```

    + `state` 传参

    ```js
    // 发送方
    const state= { name: '天天鸭' }
    router.push({ path: '/user', state })

    // 接收方直接使用
    console.log(history?.state?.name)
    ```

  + vuex、pinia、浏览器缓存 都可以进行传参

---

<!-- 以下内容从 javascript-note.md 迁移 -->

## 从 JS 笔记迁移的 Vue 相关内容

## \n 换行处理

```javascript
// 在Vue中，可以使用CSS中的white-space属性来处理换行。将该属性设置为pre-line可以保留文本中的换行符，并根据需要进行换行。 
// 你可以在包含文本的HTML元素上应用样式，例如<div>或<p>标签，然后使用white-space属性来处理换行。下面是一个示例： 
<template>
  <div class="text-container">
    {{ backendText }}
  </div>
</template>

<style>
.text-container {
  white-space: pre-line; 
}
</style>

<script>
export default {
  data() {
    return {
      backendText: "这是从后台返回的文本\n这是第二行",
    };
  },
};
</script> 

// 在上面的示例中，backendText是从后台返回的文本，其中\n表示换行。通过将white-space属性设置为pre-line，文本将根据换行符进行换行显示。 
// 请注意，如果后台返回的文本中使用的是\n作为换行符，而不是实际的换行符，你可能需要在显示前将其替换为实际的换行符。你可以使用JavaScript的replace函数来执行此操作：
data() {
  return {
    backendText: "这是从后台返回的文本\\n这是第二行",
  };
},
computed: {
  formattedText() {
    return this.backendText.replace(/\\n/g, '\n');
  }
}
// 然后在模板中使用formattedText来显示处理过的文本。
// 这样，当Vue渲染文本时，换行符将被解释为实际的换行，并根据CSS样式进行换行处理。
```

## 路由重复点击报错

```javascript
import Vue from "vue";
import Router from "vue-router";

const originalPush = Router.prototype.push;
const originReplace = Router.prototype.replace;
Router.prototype.push = function push(location, onResolve, onReject) {
  if (onResolve || onReject) {
    return originalPush.call(this, location, onResolve, onReject);
  }
  return originalPush.call(this, location).catch((err) => err);
};
Router.prototype.replace = function (location, resolve, reject) {
  if (resolve && reject) {
    originReplace.call(this, location, resolve, reject);
  } else {
    originReplace.call(
      this,
      location,
      () => {},
      () => {}
    );
  }
};
Vue.use(Router);
```

## 路由守卫

+ 全局前置守卫 (router/index.js) `router.beforeEach`

```javascript  

import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const router = new VueRouter({
  // 路由配置
  routes: [
    // ...定义路由...
  ]
});

router.beforeEach((to, from, next) => {
  // 全局前置守卫逻辑
});

export default router;
```

+ 路由独享的守卫 (router/index.js) `beforeEnter`

```javascript

import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const routes = [
  {
    path: '/example',
    component: ExampleComponent,
    beforeEnter: (to, from, next) => {
      // 在单个路由的独享守卫逻辑
    }
  },
  // ...其他路由配置...
];

const router = new VueRouter({
  routes
});

export default router;
```

+ 组件内的守卫(直接定义在组件的选项中)
`beforeRouteEnter`、`beforeRouteLeave`、`beforeRouteUpdate`

```javascript

export default {
  // ...

  beforeRouteEnter(to, from, next) {
    // 在组件实例创建之前调用
    // 可以使用回调函数或返回一个Promise延迟进入
  },

  beforeRouteLeave(to, from, next) {
    // 在离开当前路由时调用
    // 可以进行确认、保存数据等操作
  },

  beforeRouteUpdate(to, from, next) {
    // 在当前路由被复用时调用
    // 可以对参数的变化作出响应
  }

  // ...
}
```

## 前端搜索与分页

+ 带分页版本

  ```vue
  <template>
    <div class="app-container imonitorlist-performance commonRightContent"> 
      <el-form @submit.native.prevent ref="form" :inline="true">
        <el-form-item class="el-form-items" label="关键字">
          <el-input
            v-model.trim="inputContent"
            placeholder="请输入关键字"
            size="small"
            clearable
            @keyup.enter.native="searchEnterFun"
          ></el-input>
        </el-form-item>
        <el-form-item class="el-form-items">
          <el-button
            type="primary"
            icon="el-icon-search"
            size="mini"
            @click.native="searchEnterFun"
            >搜索</el-button
          >
          <el-button icon="el-icon-refresh" size="mini" @click.native="reset"
            >重置</el-button
          >
        </el-form-item>
      </el-form>
      <el-col :sm="24" :xs="24" class="performance_content commonChildContent">
        <div>
          <el-table
            :data="
              tables[0].slice(
                (currentPage - 1) * pageSize,
                currentPage * pageSize
              )
            "
            v-loading="loading"
            @expand-change="expandChange"
          >
            <el-table-column type="expand">
              <template slot-scope="props">
                <div
                  class="expand-content"
                  v-loading="props.row.expandLoading"
                  element-loading-spinner="el-icon-loading"
                  element-loading-background="rgba(0, 0, 0, 0)"
                >
                  <div
                    v-for="item in props.row.expands"
                    :key="item.id"
                    class="info"
                  >
                    <span class="info-name">{{ item.name }}</span>
                    <span class="info-unit">
                      <span v-if="item.name.indexOf('利用率') !== -1">
                        {{ Number(item.lastvalue).toFixed(2) + "%" }}
                      </span>
                      <span v-else-if="item.name.indexOf('速度') !== -1">
                        {{ setBytes(item.lastvalue, true) }}
                      </span>
                      <span v-else> {{ item.lastvalue }}{{ item.units }}</span>
                    </span>
                    <span class="info-time">{{ item.lastclock }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="指标名称" min-width="100">
            </el-table-column>
            <el-table-column label="采集值/单位" width="300"> </el-table-column>
            <el-table-column label="采集时间" width="200"></el-table-column>
          </el-table>
        </div>
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[10, 20, 30, 50, 100]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="count"
          v-show="count > 0"
        >
        </el-pagination>
      </el-col>
    </div>
  </template>

  <script>
  import {
    getApplicationsById,
    getItemsByApplicationId,
  } from "@/store/api/networkMonitor/equiplist";
  import timeStamp from "@/util/timeStamp.js";
  import { changeBytes } from "@/util/unitChange";

  export default {
    data() {
      return { 
        tableData: [],
        pageTableData: [],
        pageSize: 20,
        currentPage: 1,
        count: 0, 
        searchContent: "",
        inputContent: "",
      };
    }, 
    mounted() {
      this.getData();
    },
    computed: {
      tables() {
        const search = this.searchContent;
        if (this.inputContent == "") {
          this.searchContent = "";
          this.currentPage = 1;
          return [this.tableData, (this.count = this.tableData.length)];
        }
        if (search !== "") {
          this.tableData.filter((dataNews) => {
            return Object.keys(dataNews).some(() => {
              return String(dataNews["name"]).indexOf(search) > -1;
            });
          });
          return [
            this.tableData.filter((dataNews) => {
              return Object.keys(dataNews).some(() => {
                return String(dataNews["name"]).indexOf(search) > -1;
              });
            }),
            (this.count = this.tableData.filter((dataNews) => {
              return Object.keys(dataNews).some(() => {
                return String(dataNews["name"]).indexOf(search) > -1;
              });
            }).length),
          ];
        }
        return [this.tableData, (this.count = this.tableData.length)];
      },
    },
    watch: {
      tableData: function (val) {
        this.getPageData(val);
      },
    },
    methods: { 
      getPageData(val) {
        let pageNo = this.currentPage;
        let pageSize = this.pageSize;
        let tempTableData = [];
        let length = val.length;
        this.count = length;
        for (let i = 0; i < length; i++) {
          if (i >= (pageNo - 1) * pageSize) {
            if (i < pageNo * pageSize) {
              tempTableData.push(val[i]);
            }
            continue;
          }
          continue;
        }
        this.pageTableData = tempTableData;
        this.loading = false;
      },

      handleSizeChange(val) {
        this.pageSize = val;
        this.currentPage = 1;
      },

      handleCurrentChange(val) {
        this.currentPage = val;
      }, 
      getData() {
        this.loading = true;
        let formData = new FormData();
        formData.append("resId", this.resId);
        getApplicationsById(formData)
          .then((res) => {
            if (res?.data?.data?.[0]?.applications) {
              this.tableData = res.data.data[0].applications; 
            }
          })
          .finally(() => {
            this.loading = false;
          });
      },
    },
  };
  </script>
  ```

+ 不分页版本

  ```vue

  <template>
    <div>
      <!-- 搜索框 -->
      <el-input
        placeholder="请输入搜索内容"
        v-model="searchQuery"
        @input="filterList"
      ></el-input>

      <!-- 数据列表 -->
      <el-table :data="filteredData">
        <el-table-column
          prop="date"
          label="日期"
          width="180">
        </el-table-column>
        <el-table-column
          prop="name"
          label="姓名"
          width="180">
        </el-table-column>
        <el-table-column
          prop="address"
          label="地址">
        </el-table-column>
      </el-table>
    </div>
  </template>

  <script>
  export default {
    data() {
      return {
        searchQuery: '', // 搜索框绑定的数据
        tableData: [ // 原始数据列表
          {
            date: '2016-05-02',
            name: '王小虎',
            address: '上海市普陀区金沙江路 1518 弄'
          },
          // ...其他数据项
        ],
        filteredData: [] // 过滤后的数据列表
      };
    },
    methods: {
      filterList() {
        // 当搜索框内容变化时，调用这个方法进行数据过滤
        if (this.searchQuery) {
          this.filteredData = this.tableData.filter((item) => {
            return Object.keys(item).some((key) => {
              // 检查每个属性是否包含搜索关键字
              return String(item[key]).toLowerCase().includes(this.searchQuery.toLowerCase());
            });
          });
        } else {
          // 如果搜索框为空，则显示全部数据
          this.filteredData = this.tableData;
        }
      }
    },
    mounted() {
      // 初始化时，显示全部数据
      this.filteredData = this.tableData;
    }
  };
  </script>
  ```

+ 树形结构对象数组搜索

```vue

  <template>
    <div>
      <!-- 搜索框 -->
      <el-input
        placeholder="请输入搜索内容"
        v-model="search"
        clearable
        style="width: 200px; margin-bottom: 20px;">
      </el-input>

      <!-- 表格 -->
      <el-table :data="filteredTreeData">
        <el-table-column
          prop="date"
          label="日期"
          width="180">
        </el-table-column>
        <el-table-column
          prop="name"
          label="姓名"
          width="180">
        </el-table-column>
        <el-table-column
          prop="address"
          label="地址">
        </el-table-column>
      </el-table>
    </div>
  </template>

  <script>
  export default {
    data() {
      return {
        search: '', // 用于存储搜索框的内容
        treeData: [ // 树形结构的表格数据
          {
            id: 1,
            date: '2016-05-02',
            name: '王小虎',
            address: '上海市普陀区金沙江路 1518 弄',
            children: [
              {
                id: 11,
                date: '2016-05-03',
                name: '王小虎子',
                address: '上海市普陀区金沙江路 1519 弄'
                // 更多子节点...
              },
              // ...其他子节点
            ]
          },
          // ...其他数据
        ]
      };
    },
    computed: {
      // 根据搜索框内容筛选数据
      filteredTreeData() {
        return this.searchTree(this.treeData, this.search);
      }
    },
    methods: {
      // 遍历树形结构并搜索包含关键字的节点
      searchTree(tree, keyword) {
        const result = [];
        tree.forEach(data => {
          if (this.checkNode(data, keyword)) {
            result.push(data);
          }
          if (data.children && data.children.length > 0) {
            const children = this.searchTree(data.children, keyword);
            if (children.length > 0) {
              result.push({ ...data, children });
            }
          }
        });
        return result;
      },
      // 检查节点是否包含关键字
      checkNode(node, keyword) {
        return Object.values(node).some(value =>
          String(value).toLowerCase().includes(keyword.toLowerCase())
        );
      }
    }
  };
  </script>
  ```

## cron 表达式

  ```javascript
    // 给某个表单中的时间转化为 cron 表达式
    parseCron(form) {
      var ctData = new Array();
      ctData["seconds"] = "0";
      ctData["minutes"] = "*";
      ctData["hours"] = "*";
      ctData["day"] = "*";
      ctData["month"] = "*";
      ctData["week"] = "*";
      var ds = ["seconds", "minutes", "hours", "day", "month", "week"];
      var springTimeStr = "";
      var time = form.effectivetime2;
      var treatmentTime = function () {
        var array = time.split(":");
        ctData["hours"] = array[0];
        ctData["minutes"] = array[1];
      };
      if (form.effectivetime1 == "everyDay") {
        // 0 0 0 * * ? 每天
        treatmentTime();
        ctData["week"] = "?";
      } else if (form.effectivetime1 == "everyWeek") {
        // 0 0 0 ? * [1-7] 每周
        treatmentTime();
        ctData["day"] = "?";
        ctData["week"] = form.week;
      } else {
        // 0 0 0 [1-31|L] * ? 每月
        treatmentTime();
        ctData["day"] = form.month;
        ctData["week"] = "?";
      }
      for (var i = 0; i < ds.length; i++) {
        springTimeStr += ctData[ds[i]] + " ";
      }
      return springTimeStr;
    },

    parseCronToForm(form, cron) {
      //传入一个cron表达式
      var rds = cron.trim().split(" ");
      if (rds.length == 6) {
        if (rds[1].length == 1) {
          rds[1] = "0" + rds[1];
        }
        if (rds[2].length == 1) {
          rds[2] = "0" + rds[2];
        }
        var time = rds[2] + ":" + rds[1];
        switch (rds[3]) {
          case "*": // 0 0 0 * * ? 每天
            // form.effectivetime1 = "everyDay";
            this.$set(form, "effectivetime1", "everyDay");
            this.$set(form, "effectivetime2", time);
            break;
          case "?": // 0 0 0 ? * [1-7] 每周
            this.$set(form, "effectivetime1", "everyWeek");
            this.$set(form, "effectivetime2", time);
            this.$set(form, "week", rds[5]);
            break;
          default:
            // 0 0 0 [1-31] * ? 每月
            this.$set(form, "effectivetime1", "everyMonth");
            this.$set(form, "effectivetime2", time);
            this.$set(form, "month", rds[3] * 1);
        }
      }
    },
  ```

## Tags-Views 刷新保留

```javascript
 mounted() {
    this.beforeUnload();
  },
 methods: {
    beforeUnload() {
      // 监听页面刷新
      window.addEventListener("beforeunload", () => {
        // visitedViews数据结构太复杂无法直接JSON.stringify处理，先转换需要的数据
        let tabViews = this.visitedViewList.map((item) => {
          return {
            fullPath: item.fullPath,
            hash: item.hash,
            meta: { ...item.meta },
            name: item.name,
            params: { ...item.params },
            path: item.path,
            query: { ...item.query },
            title: item.title,
          };
        });
        sessionStorage.setItem("tabViews", JSON.stringify(tabViews));
      });
      // 页面初始化加载判断缓存中是否有数据
      let oldViews = JSON.parse(sessionStorage.getItem("tabViews")) || [];
      if (oldViews.length > 0) {
        this.$store.state.tagsView.visitedViews = oldViews;
      }
    },
  }
```

## 树形展开保留

```vue

<template>
  <div class="ip-wrap">  
    <!-- 
      :load="loadNode"
      lazy
     -->
    <el-tree
      ref="tree"
      :data="treeData"
      :props="defaultProps"
      :filter-node-method="filterNode"
      :default-expanded-keys="defaultExpandIds"
      node-key="id"
      @node-click="handleNodeClick"
      @node-expand="handleNodeExpand"
      @node-collapse="handleNodeCollapse"
      highlight-current
    >
      <span slot-scope="{ node, data }" class="tree-wrap">
        <span class="label-wrap">{{ node.label }}</span>
        <span class="num-wrap"> </span>
        <span class="button-wrap">
          <el-tooltip content="删除" placement="top" effect="dark">
            <el-button
              class="el-icon-delete"
              type="text"
              @click.stop="delNet(data)"
              v-if="data.leaf == true && data.parent_id != null"
            ></el-button>
          </el-tooltip>
          <el-tooltip content="新增子网段" placement="top" effect="dark">
            <el-button
              class="el-icon-circle-plus-outline"
              type="text"
              @click.stop="addNet(data)"
            ></el-button>
          </el-tooltip>
        </span>
      </span>
    </el-tree> 
  </div>
</template>
<script>
import {
  getTree,
  getChildren,
  delIpUsages,
  addIpManagement,
} from "@/store/api/networkMonitor/ipmgr/index.js"; 

export default {
  name: "ModelEdit", 
  data() {
    return {
      keyWord: "",
      form: {
        ip_segment: "",
        description: "",
        parent_id: "",
        parent_ip: "",
      }, 
      treeData: [],
      defaultProps: {
        children: "children",
        label: "ip_segment",
        isLeaf: "leaf",
      },
      filterText: "",
      defaultExpandIds: [], 
    };
  },
  watch: {
    filterText(val) {
      this.$refs.tree.filter(val);
    },
  },
  created() {
    if (sessionStorage.getItem("ipTreeId")) {
      let treeIds = sessionStorage
        .getItem("ipTreeId")
        .split(",");
      treeIds.map((item) => {
        this.defaultExpandIds.push(item);
      });
    }
  },
  mounted() {
    this.getData();
  },
  methods: { 
    handleNodeExpand(data) {
      // 保存当前展开的节点
      let flag = false;
      this.defaultExpandIds.some((item) => {
        if (item === data.id) {
          // 判断当前节点是否存在， 存在不做处理
          flag = true;
          return true;
        }
      });
      if (!flag) {
        // 不存在则存到数组里
        this.defaultExpandIds.push(data.id);
        sessionStorage.setItem("ipTreeId", this.defaultExpandIds);
      }
    },
    handleNodeCollapse(data) {
      // 删除当前关闭的节点
      this.defaultExpandIds.some((item, i) => {
        if (item === data.id) {
          this.defaultExpandIds.splice(i, 1);
          sessionStorage.setItem("ipTreeId", this.defaultExpandIds);
        }
      });
      this.removeChildrenIds(data); // 这里主要针对多级树状结构，当关闭父节点时，递归删除父节点下的所有子节点
    },
    // 删除树子节点
    removeChildrenIds(data) {
      const _this = this;
      if (data.children) {
        data.children.forEach(function (item) {
          const index = _this.defaultExpandIds.indexOf(item.id);
          if (index != -1) {
            _this.defaultExpandIds.splice(index, 1);
            sessionStorage.setItem("ipTreeId", _this.defaultExpandIds);
          }
          _this.removeChildrenIds(item);
        });
      }
    }, 
    getData() {
      this.treeLoading = true;
      // getChildren()
      getTree()
        .then((res) => {
          if (res?.data?.data) {
            let data = res.data.data;
            this.treeData = data;
          }
        })
        .finally(() => {
          this.treeLoading = false;
        });
    },
    loadNode(node, resolve) {
      this.treeLoading = true;
      if (node.level == 0) {
        getChildren()
          .then((res) => {
            if (res?.data?.data) {
              let data = res.data.data;
              this.treeData = data;
            }
            resolve(this.treeData);
          })
          .finally(() => {
            this.treeLoading = false;
          });
      } else {
        let params = {
          id: node.data.id,
        };
        getChildren(params)
          .then((res) => {
            if (res?.data?.data) {
              let data = res.data.data;
              resolve(data);
            }
          })
          .finally(() => {
            this.treeLoading = false;
          });
      }
    },
    filterNode(value, data) {
      if (!value) return true;
      return data.ip_segment.indexOf(value) !== -1;
    },
  },
};
</script> 
```
  