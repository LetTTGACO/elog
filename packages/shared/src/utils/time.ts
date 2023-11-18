import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

/**
 * 获取毫秒级时间戳
 * @param time 时间
 */
export const getTimes = (time: any) => {
  // 时区，默认 Asia/Shanghai
  const timezone = process.env.TIME_ZONE || 'Asia/Shanghai'
  if (typeof time === 'string') {
    const hasTimezone = /[Zz]|[+-]\d{2}:\d{2}$/.test(time)
    if (hasTimezone) {
      // 如果有时区信息，按照字符串的时区，将其转成时间戳
      return dayjs(time).valueOf()
    } else {
      // 如果没有时区信息，按照 Asia/Shanghai 时区，将其转成时间戳
      return dayjs.tz(time, timezone).valueOf()
    }
  }
  return dayjs(time).valueOf()
}

/**
 * 格式化时间
 * @param time 时间
 */
export const timeFormat = (time: any) => {
  // 时区，默认 Asia/Shanghai
  const timezone = process.env.TIME_ZONE || 'Asia/Shanghai'
  // 格式化，默认YYYY-MM-DD HH:mm:ss
  const format = process.env.TIME_FORMAT || 'YYYY-MM-DD HH:mm:ss'

  return dayjs(time).tz(timezone).format(format)
}

export const isTime = (time: any) => {
  return dayjs(time).isValid()
}
