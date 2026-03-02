# 正则与校验

## 正则

### 正则书写规则

+ `方括号 []` 匹配括号内的任一个字符
  eg: [abc] 匹配 a、b、c
      [^abc] 匹配不在括号内的任意字符

+ `点 .` 匹配除换行符以外的任意单个字符

+ `星 *` 匹配前面的字符零次或多次
  eg: a* 匹配空字符串、a、aa、aaa 等

+ `加号 +` 匹配前面的字符一次或多次
  eg: a+ 匹配 a 或 aa 等 但不匹配空字符串

+ `问号 ?` 匹配前面的字符零次或一次
  eg: a? 匹配 a 或空字符串

+ `竖线 |` 匹配两个或多个分支中的任意一个
  eg: a|b 匹配 a 或 b

+ `圆括号 ()` 用于分组，可以用于捕获匹配的内容
  eg: (ab)* 匹配 abab 或 ab

+ `反斜杠 \` 用于转义字符（使其失去特殊含义）或创建特殊字符序列
  eg: \. 匹配点号 .（转义）
      \d 匹配数字（特殊序列）
      \w 匹配单词字符 [a-zA-Z0-9_]
      \s 匹配空白字符

+ `前瞻断言` 用于检查字符串中的位置或模式，但不包括在匹配结果中
  eg: (?=a) 匹配字符串中紧跟在 a 之前的任何位置

+ `后瞻断言` 用于检查字符串中的位置或模式，但不包括在匹配结果中
  eg: (?<=a) 匹配字符串中紧跟在 a 之前的任何位置（即 a 之后的位置）

+ `懒惰匹配` 用于指定匹配模式尽可能少地匹配字符
  eg: a*? 匹配 a 零次或多次，尽可能少地匹配字符

+ `位置锚点`
  + ^ 匹配字符串的开始
  + $ 匹配字符串的结束
  + \b 匹配单词边界
  + \B 匹配非单词边界

### 常用正则

+ 端口号规则
  `portReg: /^([0-9]|[1-9]\d|[1-9]\d{2}|[1-9]\d{3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/`

+ IP规则
  `IpReg: /^(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|[1-9])\.((1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d)\.){2}(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d)$/`

+ 域名规则
  `domainReg: /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?$/`

+ 子网掩码规则
  `netMaskReg: /^(255\.(0|128|192|224|240|248|252|254)\.0\.0|255\.255\.(0|128|192|224|240|248|252|254)\.0|255\.255\.255\.(0|128|192|224|240|248|252|254))$/`

+ 整数或者小数
  `^[0-9]+(\.[0-9]{1,2})?$`

+ 只能输入数字
  `^[0-9]*$`

+ 只能输入n位的数字
  `^\d{n}$`

+ 只能输入至少n位的数字：
  `^\d{n,}$`

## 常用校验

### 名字校验

```javascript
var nameValidate = function(rule, value, callback) {
  let nameReg = store.state.nameReg
  if(!value) {
    callback(new Error('请输入名字'))
  } else if(!nameReg.test(value)) {
    callback(new Error('名字必须以字母开头，只能由字母、数字、下划线组成'))
  } else{
    callback()
  }
}
name: [{ validator: nameValidate, required: true, trigger: "blur" }],
```

### IP校验

```javascript
var checkoutIP = (rule, value, callback) => {
  const ipRules = /^((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9]))$/
  if(!ipRules.test(value)){
    callback(new Error('ip不合法'))
  }else{
    callback()
  }
};
```

### 密码校验

```js
<el-form-item label="密码" prop="password">
  <el-input type="password" v-model.trim="form.password"></el-input>
</el-form-item>
<el-form-item label="确认密码" prop="checkPass">
  <el-input type="password" v-model.trim="form.checkPass"></el-input>
</el-form-item>

data() {
  var validatePass = (rule, value, callback) => {
    if (value === "") {
      callback(new Error("请输入密码"));
    } else {
      // 如果确认密码已有值，则联动校验
      if (this.form.checkPass !== "") {
        this.$refs.form.validateField("checkPass");
      }
      callback();
    }
  };
  var validatePass2 = (rule, value, callback) => {
    if (value === "") {
      callback(new Error("请再次输入密码"));
    } else if (value !== this.form.password) {
      callback(new Error("两次输入密码不一致!"));
    } else {
      callback();
    }
  };
  return {
    rules: {
      password: [
        { required: true, validator: validatePass, trigger: "blur" },
      ],
      checkPass: [
        { required: true, validator: validatePass2, trigger: "blur" },
      ],
    },
  }
}
```
