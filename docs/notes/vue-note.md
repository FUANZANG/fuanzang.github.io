# Vue Note

## unplugin-auto-import 自动引入

+ 支持vue, vue-router, vue-i18n, @[[[[vueuse]]]]/head, @vueuse/core等自动引入
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

+ Vue3 中配置组件的name 3.3版本支持了defineOption 不需要额外安装插件
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
    props: ['value'],
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
  + 对于input元素，v-model会自动绑定value和input事件，v-model的value会和input元素的value同步，v-model的input事件会和input元素的input事件同步
  + vue3的 v-model 是modelValue 和 update:modelValue 两个属性，modelValue 用于绑定数据，update:modelValue 用于监听数据变化并更新视图

+ 对于v-model 的修改 由于要保证单项数据流 本质上是使用的 computed来处理 modelValue 和 update:modelValue

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
        return new Proxy(props[propName], {
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

