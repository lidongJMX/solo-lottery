# 项目决策记录14-奖项API字段顺序修正

**创建时间**: 2024-12-19  
**问题类型**: API数据结构修正  
**影响范围**: 后端API接口  
**状态**: ✅ 已完成  

---

## 一、问题描述

### 1.1 问题发现
在 `backend/src/routes/awards.js` 文件的第20-24行，奖项配置API的查询语句中字段顺序与数据库表结构不匹配：

**问题代码**:
```javascript
const awards = await dbAll(`
  SELECT id, level, name, description, count as total_count, remaining_count 
  FROM Award 
  ORDER BY id
`);
```

### 1.2 数据库表结构
根据 `backend/src/database/init.js` 中的Award表定义，实际字段顺序为：
```sql
CREATE TABLE IF NOT EXISTS "Award" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "count" INTEGER NOT NULL,
  "remaining_count" INTEGER NOT NULL,
  "level" INTEGER NOT NULL,
  "draw_count" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL
)
```

### 1.3 问题分析
1. **字段顺序不匹配**: API查询中level字段位置与数据库定义不符
2. **缺少字段**: 缺少重要的draw_count字段
3. **排序逻辑**: 应该按level排序而不是id排序，确保奖项按等级顺序显示

---

## 二、解决方案

### 2.1 修正字段顺序
**修改前**:
```javascript
SELECT id, level, name, description, count as total_count, remaining_count 
FROM Award 
ORDER BY id
```

**修改后**:
```javascript
SELECT id, name, description, count as total_count, remaining_count, level, draw_count 
FROM Award 
ORDER BY level
```

### 2.2 修改要点
1. **字段顺序调整**: 按照数据库表结构调整字段顺序
2. **新增字段**: 添加draw_count字段，用于前端显示一次抽取人数
3. **排序优化**: 改为按level排序，确保奖项按等级顺序返回
4. **保持别名**: 保留count as total_count别名，保持前端兼容性

---

## 三、技术细节

### 3.1 字段映射关系
| 数据库字段 | API返回字段 | 说明 |
|-----------|------------|------|
| id | id | 奖项唯一标识 |
| name | name | 奖项名称 |
| description | description | 奖项描述 |
| count | total_count | 奖项总数量 |
| remaining_count | remaining_count | 剩余数量 |
| level | level | 奖项等级 |
| draw_count | draw_count | 一次抽取人数 |

### 3.2 排序逻辑
- **修改前**: ORDER BY id - 按创建顺序排序
- **修改后**: ORDER BY level - 按奖项等级排序
- **优势**: 前端显示时奖项按等级顺序展示，用户体验更好

### 3.3 数据完整性
新增draw_count字段确保API返回完整的奖项配置信息，支持前端显示：
- 奖项基本信息（名称、描述、等级）
- 数量信息（总数、剩余数）
- 抽奖规则（一次抽取人数）

---

## 四、影响范围

### 4.1 后端影响
**修改文件**: `backend/src/routes/awards.js`
- 修改 `/awards/config` 接口的查询语句
- 保持其他接口不变
- 确保数据结构一致性

### 4.2 前端影响
**兼容性**: 前端代码无需修改
- API返回的字段名称保持不变
- 新增的draw_count字段可直接使用
- 排序变化对前端透明

### 4.3 数据库影响
**无影响**: 仅修改查询语句，不涉及表结构变更

---

## 五、验证方案

### 5.1 API测试
1. **接口调用**: GET /api/awards/config
2. **返回验证**: 确认字段顺序和数据完整性
3. **排序验证**: 确认按level排序返回

### 5.2 前端集成测试
1. **数据显示**: 确认奖项信息正确显示
2. **功能验证**: 确认抽奖功能正常
3. **兼容性**: 确认现有功能不受影响

### 5.3 数据一致性检查
1. **字段映射**: 确认所有字段正确映射
2. **数据类型**: 确认数据类型匹配
3. **业务逻辑**: 确认业务逻辑正确

---

## 六、后续优化建议

### 6.1 API规范化
1. **字段命名**: 统一前后端字段命名规范
2. **数据格式**: 建立统一的API数据格式标准
3. **文档维护**: 完善API文档，包含字段说明

### 6.2 数据验证
1. **输入验证**: 加强API输入数据验证
2. **输出验证**: 确保API输出数据格式一致
3. **错误处理**: 完善数据异常处理机制

### 6.3 测试覆盖
1. **单元测试**: 为API接口添加单元测试
2. **集成测试**: 完善前后端集成测试
3. **数据测试**: 加强数据一致性测试

---

## 七、技术总结

### 7.1 问题根因
1. **开发过程**: 在开发过程中字段顺序调整导致不一致
2. **文档缺失**: 缺少API字段规范文档
3. **测试不足**: 缺少数据结构一致性测试

### 7.2 解决思路
1. **对照数据库**: 以数据库表结构为准调整API
2. **保持兼容**: 确保修改不影响现有功能
3. **完善数据**: 补充缺失的重要字段

### 7.3 经验总结
1. **规范先行**: 建立明确的数据结构规范
2. **文档同步**: 保持代码与文档同步更新
3. **测试驱动**: 通过测试确保数据一致性

---

## 八、状态记录

| 项目 | 状态 | 完成时间 |
|------|------|----------|
| 问题识别 | ✅ 已完成 | 2024-12-19 |
| 数据库结构分析 | ✅ 已完成 | 2024-12-19 |
| API查询修正 | ✅ 已完成 | 2024-12-19 |
| 字段顺序调整 | ✅ 已完成 | 2024-12-19 |
| 排序逻辑优化 | ✅ 已完成 | 2024-12-19 |
| 文档记录 | ✅ 已完成 | 2024-12-19 |

**总体状态**: 问题已完全解决，API数据结构与数据库表结构保持一致。

---

**文档创建时间**: 2024-12-19  
**修复内容**: 奖项API字段顺序修正、新增draw_count字段、优化排序逻辑  
**技术栈**: Express.js + SQLite + Node.js  
**影响范围**: 后端API接口优化，前端兼容性保持