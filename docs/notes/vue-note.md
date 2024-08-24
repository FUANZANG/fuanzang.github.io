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
  