# Coding Workflow theo Frontend ReactJS

Hướng dẫn này mô tả thứ tự code hợp lý cho frontend ReactJS trong repo hiện tại theo hướng tách rõ tầng dữ liệu, dịch vụ, state và UI.

## Mục tiêu

- Bắt đầu từ contract dữ liệu và model.
- API service chỉ chịu trách nhiệm gọi backend và chuyển đổi dữ liệu.
- Store / state quản lý dữ liệu và workflow của feature.
- Feature chứa logic dùng lại, state điều hướng và xử lý nghiệp vụ UI.
- Component chỉ render giao diện, nhận props và emit event.

## Thứ tự code đúng

### 1. Domain / Contract

Bắt đầu bằng phần model và contract dữ liệu.

- Viết interface / type cho object trong frontend.
- Viết schema response/request DTO.
- Viết enum, constants, validator shape.
- Xác định rõ field và kiểu dữ liệu được nhận từ API.

Ví dụ:

```ts
// src/domain/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
}
```

Lưu ý:

- Domain layer frontend nên là kiểu dữ liệu và contract rõ ràng.
- Không viết logic HTTP trực tiếp trong model.

### 2. Service / API

Sau khi contract dữ liệu rõ, mới viết service layer.

- Viết API adapter gọi backend.
- Viết fetch / axios wrapper.
- Viết mapper từ response backend sang frontend model.
- Viết error handling cơ bản.

Ví dụ:

```ts
// src/service/userService.ts
import { User } from '../domain/user';

export async function getUserById(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

Lưu ý:

- Service chỉ gọi API và chuẩn hóa dữ liệu.
- Service không render UI.
- Service không nên chứa quá nhiều logic business của màn hình.

### 3. State / Store

Sau khi service đã có contract và API adapter, mới viết store state.

- Viết `slice`, `context`, `zustand` store hoặc reducer.
- Viết loading, error, success state.
- Viết selector / action cho feature.
- Chỉ state của màn hình hoặc feature được lưu trong store.

Ví dụ:

```ts
// src/stored/userStore.ts
export const userStore = {
  loading: false,
  user: null,
  error: null,
};
```

Lưu ý:

- Store không nên chứa HTML / CSS.
- Store không nên trực tiếp gọi component render.
- Store quản lý dữ liệu phân tán cho UI.

### 4. Feature / Use Case

Sau khi có model, API, store, mới code feature logic.

- Viết hook `useUserFeature`.
- Viết business flow: load, create, update, delete.
- Viết validation cơ bản trước khi gọi API.
- Viết hàm đồng bộ hóa dữ liệu từ store sang UI.

Ví dụ:

```ts
// src/feature/userFeature.ts
export async function loadUser(id: string) {
  const user = await getUserById(id);
  userStore.user = user;
}
```

Lưu ý:

- Feature nên giữ logic sử dụng lại cho một màn hình hoặc chức năng.
- Không dùng feature để render UI trực tiếp.

### 5. Component / Page

Sau khi có dữ liệu, service và feature đã hình thành, mới code UI.

- Viết component đơn lẻ: button, card, table.
- Viết page layout, route page.
- Gọi feature hook / store để lấy state.
- Chỉ render dữ liệu và dispatch event.

Ví dụ:

```tsx
// src/components/UserCard.tsx
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

Lưu ý:

- Component không chứa business rule lớn.
- Component nhận data và callback từ feature hoặc store.
- Chỉ làm phần giao diện, không gọi backend trực tiếp.

### 6. Test / Verify

Sau khi luồng UI đã chạy, mới viết test.

- Test service API adapter với mock hoặc sample response.
- Test store / reducer.
- Test UI component behavior.
- Test route / integration flow.

## Quy trình làm việc tốt nhất

1. Định nghĩa contract model và enum.
2. Viết service chuẩn hóa API response.
3. Viết store với loading, error, data.
4. Viết feature hook hoặc state workflow.
5. Viết component/page render.
6. Viết test cho service, state và UI.

## Quy tắc tránh lỗi

- Không để component gọi trực tiếp `fetch`.
- Không để component chứa logic nghiệp vụ lớn.
- Không để service render UI.
- Không để page xử lý mọi business rule.
- Luôn code theo chiều: Model / Contract → Service → Store → Feature → Component / Page → Test.

## Workflow khuyến nghị cho nhóm

```text
Domain / Type / Contract
  ↓
Service API
  ↓
Store / State
  ↓
Feature Hook / Use Case
  ↓
Component / Page
  ↓
Test
```