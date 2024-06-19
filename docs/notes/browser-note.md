# 浏览器 Note

[Web API](https://wangdoc.com/webapi/)

## IndexedDB

+ IndexedDB是一种在浏览器中使用的客户端数据库，它提供了一种存储和检索大量结构化数据的方式
  + 与LocalStorage相比，IndexedDB具有更高的存储容量和更好的性能。LocalStorage通常只能存储几MB的数据，而IndexedDB可以存储GB级别的数据。
  + LocalStorage只能存储字符串类型的数据，而IndexedDB可以存储任意类型的数据。
  + 与WebSQL相比，IndexedDB是一种更为现代化和强大的解决方案。WebSQL是一种基于SQL的关系型数据库，但是它已经不再被推荐使用，因为它的规范已经停止更新，并且在某些浏览器中已经被移除。相比之下，IndexedDB是一种更加标准化和跨浏览器的解决方案，得到了广泛的支持

+ 特点和优势
  + 强大的存储能力：IndexedDB可以存储大量的结构化数据，支持GB级别的存储容量。
  + 高性能的数据检索：IndexedDB支持索引，可以通过索引进行高效的数据查询。
  + 事务支持：IndexedDB支持事务操作，可以在一个原子操作中执行多个数据库操作，保证数据的一致性。
  + 离线访问和数据持久化：IndexedDB可以使得Web应用程序具备离线访问和数据持久化的能力。
  + 跨浏览器支持：IndexedDB得到了主流浏览器的广泛支持，可以在多个平台和设备上使用。

+ 使用示例

  ```js
  // 打开或创建数据库
  var request = indexedDB.open('myDatabase', 1);

  // 数据库打开成功的回调函数
  request.onsuccess = function(event) {
    var db = event.target.result;
    
    // 创建一个事务
    var transaction = db.transaction(['users'], 'readwrite');
    
    // 获取对象存储空间
    var store = transaction.objectStore('users');
    
    // 添加数据
    var user = { id: 1, name: 'John Doe', age: 30 };
    var addUserRequest = store.add(user);
    
    // 添加数据成功的回调函数
    addUserRequest.onsuccess = function(event) {
      console.log('User added successfully');
    };
    
    // 查询数据
    var getUserRequest = store.get(1);
    
    // 查询数据成功的回调函数
    getUserRequest.onsuccess = function(event) {
      var user = event.target.result;
      console.log('User:', user);
    };
    
    // 关闭数据库
    db.close();
  };

  // 数据库打开失败的回调函数
  request.onerror = function(event) {
    console.error('Failed to open database');
  };
  ```

## MutationObserver

+ 用于监听DOM对象的变更（包括子节点），当节点属性发生变化，或执行增删改操作时执行对应的callback

+ 基本使用

  ```js
  // Observer需要一个用于监听的目标DOM
  const targetNode = document.getElementById("app");

  //用于确定mutation监听变化的范围
  const config = { 
    attributes: true, // 监听目标节点的属性变化，例如id，class等属性
    childList: true, // 除目标节点外还要监听目标节点的直接子节点
    subtree: true,  // subtree的范围大于childList，还包括子节点children
    characterData: true   // 监听TextNode需要额外配置，默认TextNode变化不会触发callback
  };

  // 当观察到变动时执行的回调函数，mutationsList包含本次变更的信息
  const callback = function (mutationsList, observer) {
    console.log(mutationsList)
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
  ```

+ API

  + `observe` 用于开启对某个DOM的监听，一个MutationObserver可以通过多次调用observe监听多个DOM的变化。
  + `disconnect` 调用observer.disconnect后Observer将不再监听target，如果不需要监听请及时调用该方法，以免产生预期之外的行为以及内存泄漏
  + `takeRecords` 用于获取在事件队列中但还未传递给callback的mutation对象，通常使用在调用disconnect时又不想丢失之前的mutationRecords（如果mutation连续触发，可能出现mutation还在队列中但未传递给callback的情况）

## IntersectionObserver

+ 用于监听一个元素的可见比例（一个DOM元素被另一个DOM元素遮挡百分比）变化

+ 基本使用

  ```js

  const target = document.getElementById('app');

  const options = {
    root: rootTarget, // 相对于某个元素进行遮挡计算
    rootMargin: '0px', // 进行计算的边界范围，通过rootMargin可以实现提前计算或延迟计算（相对于root原本尺寸）的效果
    threshold: 0.5 // 触发callback时的遮挡比例，0.5代表元素被遮挡50%时触发callback。由于浏览器事件循环机制的影响，callback触发时遮挡比例通常不会是精确的50%。
  };

  const intersectionObserver = new IntersectionObserver((entries, observer) => {
    //和MutationObserver相同，也是产生一个array
    entries.forEach(entry => {
      console.log(entry)
    });
  }, options);

  intersectionObserver.observe(target);

  ```

+ API

  + `observe & options` observe方法用于启动一个Observer对DOM元素的监听。在创建IntersectionObserver时可以通过传入option改变监听的行为

    ```js
    const options = {
      root: root, 
      rootMargin: '100px', 
      threshold: 0.7
    };
    ```

    > 在上面的配置中，通过配置rootMargin为100px在target距离root元素100px时即可判定为被遮挡，通过threshold设置为0.7，当遮挡比例查过70%时执行callback。

  + `entry` callback第一个param是entry对象构成的array，entry包含了触发callback时DOM的位置信息

## ResizeObserver

+ 用于监听DOM尺寸变化的observer，当DOM尺寸变化是执行callback

+ 基本使用

  ```js
  const box = document.getElementById('box');

  const resizeObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
      console.log(entry)
    });
  });

  resizeObserver.observe(box);
  ```

+ API

  + `entry` 对象包含resize相关的信息，下面看一下entry的结构

    ```js
    {
      // 不同box-sizing下的尺寸
      borderBoxSize: [{
        blockSize: 200,
        inlineSize: 200,
      }],
      contentBoxSize: [{
        blockSize: 200,
        inlineSize: 200,
      }],
      contentRect: {
        bottom: 200,
        height: 200,
        left: 0,
        right: 200,
        top: 0,
        width: 200,
        x: 0,
        y: 0
      },
      // 在物理设备像素上的大小, 在不同的屏幕上尺寸不同例如Retina
      devicePixelContentBoxSize: [{
          blockSize: 300,
          inlineSize: 300
        }
      ],
      target: div#resizable-box
    }
    ```

## PerformanceObserver

+ 用于监听浏览器的performance事件，方便在performance事件触发时作统一处理，监听页面性能指标的变化，包括页面加载时间、资源加载时间、页面渲染时间等

+ 基本使用
  
  ```js
  // mdn demo
  function perf_observer(list, observer) {
    console.log(list)
  }
  var observer2 = new PerformanceObserver(perf_observer);
  // entryTypes用于指定要监听的事件类型
  observer2.observe({ entryTypes: ["measure"] });
  ```

+ API
  常见的 `entryTypes`
  + mark：用于标记时间戳的事件
  + measure：performance.measure触发的事件
  + frame：网页渲染的事件
  + navigation：导航的事件，例如页面加载或重新加载
  + resource：资源加载事件
  + longtask：长任务事件
  + paint：绘制事件，例如FP，FCP
  + layout-shift：用于监视布局变化的事件

## ReportingObserver

+ 用于监听浏览器报告的事件，例如废弃API，过时特性，网络错误。做监控SDK的同学应该经常能用到，日常业务代码用的比较少

+ 基本使用

  ```js
  const observer = new ReportingObserver((reports, observer) => {
    reports.forEach(report => {
      console.log(report);
    });
  });

  // 监听过时特性
  observer.observe({ types: ['deprecation'] });
  ```

