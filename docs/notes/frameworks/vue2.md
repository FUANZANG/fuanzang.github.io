# Vue 2 笔记

> 📌 Vue 3 Composition API 相关内容请查看 [Vue 3 笔记](/notes/frameworks/vue3)

<!-- 本文件记录 Vue 2 (Options API) 的实战技巧与常用代码 -->

## Vue 2 概述

> ⚠️ Vue 2 已于 **2023-12-31 正式 EOL**，不再接受官方维护与安全修复。新项目请使用 Vue 3，老项目建议参考本文末尾的迁移备忘进行升级。

Vue 2 是基于 Options API 的前端框架，通过 `data`、`computed`、`methods`、`watch` 等选项组织组件逻辑。本笔记记录了 Vue 2 项目中常用的实战技巧，包括路由处理、前端搜索分页、cron 表达式解析、树形组件状态保留等。

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
    // 会对参数的变化作出响应
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

---

## Vue 2 → Vue 3 迁移备忘

> 维护老项目迁移时的坑点速查，按影响程度排序。

### 1. 实例与挂载

```js
// ❌ Vue 2
import Vue from 'vue'
import App from './App.vue'
Vue.config.productionTip = false
new Vue({ render: h => h(App) }).$mount('#app')

// ✅ Vue 3
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```

+ `new Vue()` → `createApp()`
+ `Vue.config.productionTip` 移除
+ 全局 API 从 `Vue.xxx` 改为 `app.xxx`（如 `Vue.use` → `app.use`）

### 2. 全局 API 变更

```js
// ❌ Vue 2 — 全局污染，所有实例共享
Vue.component('MyComponent', { /* ... */ })
Vue.directive('focus', { /* ... */ })
Vue.mixin({ /* ... */ })
Vue.use(plugin)
Vue.prototype.$http = axios

// ✅ Vue 3 — 挂载到 app 实例，不污染全局
const app = createApp(App)
app.component('MyComponent', { /* ... */ })
app.directive('focus', { /* ... */ })
app.mixin({ /* ... */ })
app.use(plugin)
app.config.globalProperties.$http = axios
```

### 3. `$on` / `$off` / `$once` 移除 → 用 mitt

```js
// ❌ Vue 2 — 实例方法，已移除
this.$on('event', handler)
this.$emit('event', data)
this.$off('event', handler)

// ✅ Vue 3 — 用 mitt 替代
import mitt from 'mitt'
const emitter = mitt()

// 发送
emitter.emit('event', data)
// 监听
emitter.on('event', handler)
// 取消
emitter.off('event', handler)
// 监听一次（mitt 没有 $once，手动实现）
const onceHandler = (data) => {
  handler(data)
  emitter.off('event', onceHandler)
}
emitter.on('event', onceHandler)
```

### 4. `$children` 移除 → 用 `$refs`

```js
// ❌ Vue 2 — $children 已移除
this.$children[0].someMethod()

// ✅ Vue 3 — 用 ref + defineExpose
// 父组件
<ChildComp ref="childRef" />
const childRef = ref(null)
childRef.value.someMethod()

// 子组件需要主动暴露
defineExpose({ someMethod })
```

### 5. `.sync` 修饰符移除 → `v-model:xxx`

```html
<!-- ❌ Vue 2 -->
<ChildComp :title.sync="pageTitle" />
<!-- 等价于 -->
<ChildComp :title="pageTitle" @update:title="pageTitle = $event" />

<!-- ✅ Vue 3 — 直接用 v-model 带参数 -->
<ChildComp v-model:title="pageTitle" />
<ChildComp v-model:visible="showDialog" />
```

```js
// Vue 2 子组件
this.$emit('update:title', newValue)

// Vue 3 子组件 — 写法一样，但声明方式不同
const emit = defineEmits(['update:title'])
emit('update:title', newValue)
```

### 6. `$listeners` 合并到 `$attrs`

```js
// ❌ Vue 2 — $attrs 和 $listeners 分开
<ChildComp v-bind="$attrs" v-on="$listeners" />

// ✅ Vue 3 — $listeners 移除，全部在 $attrs 里
<ChildComp v-bind="$attrs" />
```

```js
// Vue 2
console.log(this.$attrs)    // 未声明的 props
console.log(this.$listeners) // 未声明的事件监听器

// Vue 3
console.log(this.$attrs)    // 未声明的 props + 事件监听器，合在一起了
// script setup 中
const attrs = useAttrs()
```

### 7. `$set` / `$delete` 移除 → 直接赋值

```js
// ❌ Vue 2 — 因为 Object.defineProperty 的限制，需要 $set
this.$set(this.obj, 'newKey', value)
this.$set(this.arr, index, value)
this.$delete(this.obj, 'key')

// ✅ Vue 3 — Proxy 响应式，直接操作即可
this.obj.newKey = value
this.arr[index] = value
delete this.obj.key
```

### 8. `$destroy` 移除

```js
// ❌ Vue 2 — 手动销毁实例
vm.$destroy()

// ✅ Vue 3 — 用 app.unmount()
app.unmount()
```

### 9. Filters 移除 → 用 computed / 方法

```js
// ❌ Vue 2
<template>
  <p>{{ price | currency }}</p>
</template>
filters: {
  currency(val) { return `¥${val.toFixed(2)}` }
}

// ✅ Vue 3 — 用计算属性或方法
<template>
  <p>{{ formatCurrency(price) }}</p>
</template>
<script setup>
const formatCurrency = (val) => `¥${val.toFixed(2)}`
</script>
```

> 💡 全局 filter 也移除了，建议封装成工具函数统一导入。

### 10. EventBus → mitt / provide-inject

```js
// ❌ Vue 2 — 全局事件总线
// main.js
Vue.prototype.$bus = new Vue()
// 组件 A
this.$bus.$emit('event', data)
// 组件 B
this.$bus.$on('event', (data) => { /* ... */ })

// ✅ Vue 3 方案一：mitt（推荐简单场景）
// bus.js
import mitt from 'mitt'
export const emitter = mitt()
// 组件 A
import { emitter } from './bus'
emitter.emit('event', data)
// 组件 B
emitter.on('event', (data) => { /* ... */ })

// ✅ Vue 3 方案二：provide/inject（推荐组件树内通讯）
// 祖先组件
import { provide, ref } from 'vue'
const data = ref('hello')
provide('sharedData', data)
// 后代组件
import { inject } from 'vue'
const data = inject('sharedData')
```

### 11. Vue CLI → Vite 迁移

```js
// ❌ Vue CLI — vue.config.js
module.exports = {
  devServer: { port: 3000 },
  configureWebpack: { /* webpack 配置 */ }
}

// ✅ Vite — vite.config.js / vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  server: { port: 3000 }
})
```

**迁移要点：**
+ `vue.config.js` → `vite.config.js`
+ `process.env.VUE_APP_XXX` → `import.meta.env.VITE_XXX`
+ `.env` 文件前缀从 `VUE_APP_` 改为 `VITE_`
+ 静态资源引用：`require('./img.png')` → `new URL('./img.png', import.meta.url).href`
+ `babel.config.js` → Vite 默认用 esbuild，一般不需要 Babel
+ CSS 预处理器直接装依赖即可（`sass`、`less` 等）
+ 路径别名：webpack 的 `@` → Vite 需要同时配 `resolve.alias`

```js
// vite.config.js 路径别名
import path from 'path'
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
```

### 12. Element UI → Element Plus

| 对比项 | Element UI (Vue 2) | Element Plus (Vue 3) |
|--------|-------------------|---------------------|
| 包名 | `element-ui` | `element-plus` |
| 引入 | `Vue.use(ElementUI)` | `app.use(ElementPlus)` |
| 图标 | `<i class="el-icon-edit" />` | `<el-icon><Edit /></el-icon>` |
| 图标引入 | 内置，无需额外安装 | 需要 `@element-plus/icons-vue` |
| 组件 API | 部分用 `.sync` | 统一用 `v-model:xxx` |
| 弹窗 | `visible.sync` | `v-model` |
| 表格 | `type="expand"` 写法不变 | 基本兼容 |
| 表单验证 | `this.$refs.form.validate()` | 写法一致，返回 Promise |

```js
// ❌ Vue 2 + Element UI
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI)

// ✅ Vue 3 + Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
app.use(ElementPlus)
// 注册所有图标（按需注册也行）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
```

**常见组件 API 变更：**

```html
<!-- 弹窗：.sync → v-model -->
<!-- ❌ Vue 2 -->
<el-dialog :visible.sync="dialogVisible" />
<!-- ✅ Vue 3 -->
<el-dialog v-model="dialogVisible" />

<!-- 抽屉 -->
<!-- ❌ Vue 2 -->
<el-drawer :visible.sync="drawerVisible" />
<!-- ✅ Vue 3 -->
<el-drawer v-model="drawerVisible" />

<!-- 图标 -->
<!-- ❌ Vue 2 -->
<el-button icon="el-icon-search" />
<!-- ✅ Vue 3 -->
<el-button :icon="Search" />
<!-- script setup 中 -->
import { Search } from '@element-plus/icons-vue'
```

### 13. Vuex → Pinia

```js
// ❌ Vue 2 + Vuex
import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)
const store = new Vuex.Store({
  state: { count: 0 },
  mutations: { INCREMENT(state) { state.count++ } },
  actions: { increment({ commit }) { commit('INCREMENT') } },
  getters: { doubleCount: state => state.count * 2 }
})
// 组件中
this.$store.commit('INCREMENT')
this.$store.dispatch('increment')

// ✅ Vue 3 + Pinia
import { defineStore } from 'pinia'
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: { doubleCount: (state) => state.count * 2 },
  actions: {
    increment() { this.count++ }  // 不需要 mutation 了
  }
})
// 组件中
import { useCounterStore } from '@/stores/counter'
const counter = useCounterStore()
counter.increment()  // 直接调 action
```

**迁移要点：**
+ `mutations` 移除 → 直接写 `actions` 修改 state
+ `commit` / `dispatch` 区分消除 → 统一 `action()`
+ `mapState` / `mapActions` 等辅助函数 → 直接解构 `storeToRefs(store)`
+ 模块化 → 每个 store 就是独立文件，不需要 `modules`

```js
// ❌ Vuex 组件中解构
import { mapState, mapActions } from 'vuex'
computed: mapState(['count']),
methods: mapActions(['increment'])

// ✅ Pinia 组件中解构
import { storeToRefs } from 'pinia'
const counter = useCounterStore()
const { count, doubleCount } = storeToRefs(counter) // 保持响应式
const { increment } = counter  // action 直接解构
```

### 14. Vue Router 3 → Vue Router 4

```js
// ❌ Vue 2 + Vue Router 3
import VueRouter from 'vue-router'
Vue.use(VueRouter)
const router = new VueRouter({
  mode: 'history',  // hash 模式默认不写
  routes
})

// ✅ Vue 3 + Vue Router 4
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
const router = createRouter({
  history: createWebHistory(),     // 原 mode: 'history'
  // history: createWebHashHistory(), // 原 mode: 'hash'
  routes
})
```

**变更要点：**
+ `mode: 'history'` → `history: createWebHistory()`
+ `mode: 'hash'` → `history: createWebHashHistory()`
+ `router.onReady(cb)` → `router.isReady().then(cb)`
+ `params` 传参移除（4.1.4+）→ 用 `query` 或 `state`
+ 通配符 `*` → 用 `/:pathMatch(.*)*`
+ 路由守卫中 `next()` 可选（推荐用 `return` 替代）

```js
// ❌ Vue Router 3 — 通配路由
{ path: '*', component: NotFound }

// ✅ Vue Router 4
{ path: '/:pathMatch(.*)*', component: NotFound }

// ❌ Vue Router 3 — 守卫
router.beforeEach((to, from, next) => {
  if (!isAuth) return next('/login')
  next()
})

// ✅ Vue Router 4 — 推荐 return 代替 next
router.beforeEach((to, from) => {
  if (!isAuth) return '/login'
  // 不写 return 等价于 next()
})
```

### 15. 其他移除/变更速查

| 移除项 | Vue 2 用法 | Vue 3 替代方案 |
|--------|-----------|---------------|
| `$on` / `$off` / `$once` | 实例事件 | mitt 库 |
| `$children` | 访问子组件 | `$refs` + `defineExpose` |
| `$listeners` | 事件监听器 | 合并到 `$attrs` |
| `$set` / `$delete` | 响应式操作 | 直接赋值/删除 |
| `$destroy` | 销毁实例 | `app.unmount()` |
| `$isServer` | 判断 SSR | `import.meta.env.SSR` |
| `$scopedSlots` | 作用域插槽 | 统一用 `$slots` |
| `.native` 修饰符 | 原生事件 | 移除，自动识别 |
| `.sync` 修饰符 | 双向绑定 | `v-model:xxx` |
| `inline-template` | 内联模板 | 移除 |
| `keyCode` 修饰 | `@keyup.13` | `@keyup.enter` |
| `data` 合并 | 可返回对象 | 必须返回函数 |
| `filters` | 过滤器 | computed / 方法 |
| `beforeCreate` / `created` | 生命周期 | `setup()` 替代 |
| `beforeDestroy` | 生命周期 | `onBeforeUnmount` |
| `destroyed` | 生命周期 | `onUnmounted` |
| `renderError` | 错误处理 | `onErrorCaptured` |
| `mixins` | 逻辑复用 | Composables (组合式函数) |

### 16. mixins → Composables

```js
// ❌ Vue 2 — mixins 复用逻辑（命名冲突、来源不明）
// useMouseMixin.js
export default {
  data() {
    return { x: 0, y: 0 }
  },
  mounted() {
    window.addEventListener('mousemove', e => {
      this.x = e.clientX
      this.y = e.clientY
    })
  }
}
// 组件中使用
mixins: [useMouseMixin]

// ✅ Vue 3 — Composables 组合式函数（来源清晰、无命名冲突）
// useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'
export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  const handler = (e) => {
    x.value = e.clientX
    y.value = e.clientY
  }
  onMounted(() => window.addEventListener('mousemove', handler))
  onUnmounted(() => window.removeEventListener('mousemove', handler))
  return { x, y }
}
// 组件中使用
import { useMouse } from './useMouse'
const { x, y } = useMouse()
```

### 17. 迁移工具

+ **[@vue/compat](https://v3-migration.vuejs.org/migration-build.html)** — 官方兼容构建，Vue 2 写法在 Vue 3 上运行，控制台会输出废弃 API 警告，逐步迁移
+ **[vue-codemod](https://github.com/vuejs/codemod-transform-vue)** — 自动转换 Vue 2 语法到 Vue 3
+ 安装兼容模式：`npm install @vue/compat@^3.2`

```js
// vite.config.js — 启用兼容模式
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          compatConfig: {
            MODE: 2  // 启用 Vue 2 兼容模式
          }
        }
      }
    })
  ]
})
```

> 💡 **推荐迁移策略：** 先上 `@vue/compat` 跑起来 → 逐个修复控制台警告 → 关闭兼容模式 → 切换到标准 Vue 3 模式。
