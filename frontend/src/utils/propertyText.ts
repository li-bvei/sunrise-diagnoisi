import type { PropertyProfile } from '@/types/property'

export function formatYen(amount: number, zh: boolean): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))}${zh ? '日元' : '円'}`
}

export function propertyProfileLines(property: PropertyProfile, zh: boolean): string[] {
  const lines: string[] = []
  if (property.name.trim()) lines.push(`${zh ? '房源名称' : '物件名'}：${property.name.trim()}`)
  if (property.address.trim()) lines.push(`${zh ? '地址' : '住所'}：${property.address.trim()}`)
  if (property.station.trim()) {
    const walk = property.walkMinutes === null ? '' : ` ${zh ? '步行' : '徒歩'}${property.walkMinutes}${zh ? '分钟' : '分'}`
    lines.push(`${zh ? '交通' : '交通'}：${property.station.trim()}${walk}`)
  } else if (property.walkMinutes !== null) {
    lines.push(`${zh ? '车站步行' : '駅徒歩'}：${property.walkMinutes}${zh ? '分钟' : '分'}`)
  }
  if (property.area !== null) lines.push(`${zh ? '专有面积' : '専有面積'}：${property.area}㎡`)
  if (property.layout.trim()) lines.push(`${zh ? '格局' : '間取り'}：${property.layout.trim()}`)
  if (property.buildingAge !== null) lines.push(`${zh ? '建筑年限' : '築年数'}：${property.buildingAge}${zh ? '年' : '年'}`)
  if (property.managementFee !== null) lines.push(`${zh ? '月管理费/共益费' : '月額管理費・共益費'}：${formatYen(property.managementFee, zh)}`)
  return lines
}
