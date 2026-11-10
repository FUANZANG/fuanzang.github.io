# Python 鉴权（FastAPI + JWT）

> 以 [FastAPI: OAuth2 with Password and JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)、[Security First Steps](https://fastapi.tiangolo.com/tutorial/security/first-steps/) 为准。OWASP 提醒见 [FastAPI Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/FastAPI_Security_Cheat_Sheet.html)：`OAuth2PasswordBearer` **只抽 Bearer，不验签**。数据层见 [Python 数据访问](/notes/python/python-data)；对照 [Node 鉴权](/notes/node/node-auth)、[前后端鉴权对照](/notes/practice/auth-end-to-end)。

## 1. FastAPI 在安全栈里的位置

```
客户端
  → Authorization: Bearer <token>
  → OAuth2PasswordBearer：取出 token 字符串（没有则 401）
  → 你的依赖：jwt.decode 验签 / 查用户 / 查权限
  → 路由业务
```

官方教程用 **OAuth2 Password 流 + JWT Bearer** 作为「可直接用于应用」的示例：登录换 token，之后带 Bearer 访问受保护路由。这不是完整授权服务器；企业 SSO 仍走 [OIDC](/notes/practice/sso-oidc)。

## 2. 密码：只存哈希

教程使用安全哈希（如 bcrypt / 文档当前推荐库——实现时跟官方示例与库文档，**不要**明文存密码）。校验：`verify(plain, hashed)`；登录成功再签发 JWT。

## 3. JWT：签发与校验要点

官方强调：

- 用足够长的随机 **`SECRET_KEY`**（文档给了用 `openssl` 生成示例；**不要**用教程里的示例密钥上生产）。  
- `ALGORITHM` 如 `"HS256"`；**解码时显式传入 `algorithms=[...]`**，不要信任 token header 里的 alg（OWASP）。  
- `sub`（subject）放用户唯一标识字符串；多实体场景可加前缀避免碰撞（官方 technical details）。  
- 设 **`exp`**；过期后必须重新登录或走 refresh 设计。

```python
# 概念骨架——完整可运行示例以 FastAPI 官方 oauth2-jwt 页为准
from datetime import datetime, timedelta, timezone
import jwt

SECRET_KEY = "..."  # 来自环境变量
ALGORITHM = "HS256"
ACCESS_EXPIRE_MIN = 30

def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MIN)
    return jwt.encode(
        {"sub": subject, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
```

验签失败 / 过期 → `HTTPException(401)`，并带 `WWW-Authenticate: Bearer`（与官方示例一致）。

## 4. 依赖注入：`get_current_user`

```python
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = await get_user_by_username(username)  # 你的 DB
    if user is None:
        raise credentials_exception
    return user

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)
```

`tokenUrl="token"` **不会**自动创建路由，只声明「客户端去哪换 token」，并写进 OpenAPI/`/docs`。相对路径在反代场景更稳（官方说明）。

路由：

```python
@app.get("/users/me")
async def read_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
```

授权（能否改别人的资源）在业务里再判，或另写 `Depends(require_admin)`——与 Node Guard / Spring `@PreAuthorize` 同层。

## 5. 和前端怎么对

| 项 | 约定 |
|----|------|
| 登录 | 官方 Password 流用 **form** 字段 `username`/`password`（OAuth2 规定）；若你改成 JSON body，要在文档里写清，并知道 `/docs` 的 OAuth 按钮预期 |
| 之后 | `Authorization: Bearer …` |
| 存储 | Access 短；勿长期放 localStorage（见前端鉴权） |
| 错误 | 401 / 403 语义与 [API 设计](/notes/practice/api-design) 一致 |

## 6. 清单

- [ ] 密钥来自环境变量，不进仓库  
- [ ] 密码只存哈希  
- [ ] decode 时固定 algorithms，校验 exp  
- [ ] Bearer 抽取 ≠ 已认证；必须自己验签  
- [ ] 权限在服务端二次校验  
- [ ] 生产考虑 refresh、吊销、轮换密钥（进阶，对照鉴权对照篇）  

## 参考

- [FastAPI OAuth2 JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [FastAPI Security first steps](https://fastapi.tiangolo.com/tutorial/security/first-steps/)
- [OWASP FastAPI Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/FastAPI_Security_Cheat_Sheet.html)
