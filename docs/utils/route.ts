import * as path from 'path'
import * as fs from 'fs'

// 文件根目录
const DIR_PATH = path.resolve(__dirname, '../docs/')
// 白名单,过滤不是文章的文件和文件夹
const WHITE_LIST = ['index.md', '.vitepress']

// 判断是否是文件夹
const isDirectory = (path: string): boolean => fs.lstatSync(path).isDirectory()

// 取差值
const intersections = (arr1: any, arr2: any) =>
  Array.from<string>(new Set(arr1.filter((item: string) => !new Set(arr2).has(item))))

const getList = (params: string[], pathdir: string, pathname: string): any[] => {
  // 存放结果
  const res = []
  // 开始遍历params
  for (let index in params) {
    // 拼接目录
    const dir = path.resolve(pathdir, params[index])
    // 判断是否是文件夹
    const isDir = isDirectory(dir)
    if (isDir) {
      // 如果是文件夹,读取之后作为下一次递归参数
      const files = fs.readdirSync(dir)
      res.push({
        text: params[index],
        collapsible: true,
        items: getList(files, dir, `${pathname}/${params[index]}`),
      })
    } else {
      // 获取名字
      const name = params[index].split('.')[0]
      res.push({
        text: name,
        link: `${pathname}/${name}`,
      })
    }
  }
  return res
}

export const genSideBar = (pathname: string) => {
  // 我们把方法导出直接使用
  // 获取pathname的路径
  const dirPath = path.resolve(DIR_PATH, pathname)
  // 读取pathname下的所有文件或者文件夹
  const files = fs.readdirSync(dirPath)
  // 过滤掉
  const items = intersections(files, WHITE_LIST)
  // getList函数后面会讲到
  const list = getList(items, dirPath, pathname)
  console.log('list', list)
  return list
}
