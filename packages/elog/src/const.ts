/** 文档缓存状态，决定下次同步时是追加、覆盖还是重试失败文档。 */
export const enum DocStatus {
  NEW = 1,
  UPDATE = 2,
  IMAGE_ERROR = 3,
  DOC_ERROR = 4,
}
