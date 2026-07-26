export interface UniversityAliasOverride {
  universityId: string
  displayNames?: { zh?: string; ja?: string; en?: string }
  aliases?: { zh?: string[]; ja?: string[]; en?: string[] }
  translationStatus: 'verified' | 'common-name'
  verifiedAt: string
  note?: string
}

const verifiedAt = '2026-07-27'

const entries: UniversityAliasOverride[] = [
  { universityId: 'the-university-of-tokyo', displayNames: { zh: '东京大学' }, aliases: { zh: ['東亰大学', '東大', '东大'], en: ['University of Tokyo', 'UTokyo'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'kyoto-university', displayNames: { zh: '京都大学' }, aliases: { zh: ['京大'], en: ['Kyodai'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'the-university-of-osaka', displayNames: { zh: '大阪大学' }, aliases: { zh: ['阪大'], en: ['Osaka University'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'tohoku-university', displayNames: { zh: '东北大学' }, aliases: { zh: ['東北大学', '日本东北大学'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'keio-university', displayNames: { zh: '庆应义塾大学' }, aliases: { zh: ['慶應義塾大学', '庆应大学'], en: ['Keio'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'waseda-university', displayNames: { zh: '早稻田大学' }, aliases: { zh: ['早稲田大学'], en: ['Waseda'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'institute-of-science-tokyo-previously-tokyo-medical-and-dental-university-tokyo-institute-of-technology', displayNames: { zh: '东京科学大学' }, aliases: { zh: ['東京科学大学', '东京工业大学', '東京工業大学'], en: ['Institute of Science Tokyo', 'Tokyo Institute of Technology', 'Tokyo Tech'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'hokkaido-university', displayNames: { zh: '北海道大学' }, aliases: { zh: ['北大'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'nagoya-university', displayNames: { zh: '名古屋大学' }, aliases: { zh: ['名大'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'kyushu-university', displayNames: { zh: '九州大学' }, aliases: { zh: ['九大'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'university-of-tsukuba', displayNames: { zh: '筑波大学' }, aliases: { zh: ['筑大'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'hiroshima-university', displayNames: { zh: '广岛大学' }, aliases: { zh: ['廣島大学'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'kobe-university', displayNames: { zh: '神户大学' }, aliases: { zh: ['神戸大学'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'hitotsubashi-university', displayNames: { zh: '一桥大学' }, aliases: { zh: ['一橋大学'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'chiba-university', displayNames: { zh: '千叶大学' }, aliases: { zh: ['千葉大学'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'yokohama-national-university', displayNames: { zh: '横滨国立大学' }, aliases: { zh: ['横浜国立大学', '横国'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'sophia-university', displayNames: { zh: '上智大学' }, aliases: { en: ['Sophia'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'meiji-university', displayNames: { zh: '明治大学' }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'doshisha-university', displayNames: { zh: '同志社大学' }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'ritsumeikan-university', displayNames: { zh: '立命馆大学' }, aliases: { zh: ['立命館大学'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'beihang-university', displayNames: { zh: '北京航空航天大学' }, aliases: { zh: ['北航'], en: ['BUAA'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'beijing-institute-of-technology', displayNames: { zh: '北京理工大学' }, aliases: { zh: ['北理工'], en: ['BIT'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'beijing-normal-university', displayNames: { zh: '北京师范大学' }, aliases: { zh: ['北师大'], en: ['BNU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'central-south-university', displayNames: { zh: '中南大学' }, aliases: { en: ['CSU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'east-china-normal-university', displayNames: { zh: '华东师范大学' }, aliases: { zh: ['华东师大'], en: ['ECNU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'fudan-university', displayNames: { zh: '复旦大学' }, aliases: { zh: ['复旦'], en: ['FDU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'harbin-institute-of-technology', displayNames: { zh: '哈尔滨工业大学' }, aliases: { zh: ['哈工大'], en: ['HIT'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'huazhong-university-of-science-and-technology', displayNames: { zh: '华中科技大学' }, aliases: { zh: ['华科'], en: ['HUST'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'hunan-university', displayNames: { zh: '湖南大学' }, aliases: { zh: ['湖大'], en: ['HNU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'nanjing-university', displayNames: { zh: '南京大学' }, aliases: { zh: ['南大'], en: ['NJU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'nankai-university', displayNames: { zh: '南开大学' }, aliases: { zh: ['南开'], en: ['NKU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'northeastern-university-shenyang', displayNames: { zh: '东北大学' }, aliases: { zh: ['东北大学沈阳'], en: ['NEU China'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'northwestern-polytechnical-university', displayNames: { zh: '西北工业大学' }, aliases: { zh: ['西工大'], en: ['NPU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'peking-university', displayNames: { zh: '北京大学' }, aliases: { zh: ['北大'], en: ['PKU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'shandong-university', displayNames: { zh: '山东大学' }, aliases: { zh: ['山大'], en: ['SDU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'shanghai-jiao-tong-university', displayNames: { zh: '上海交通大学' }, aliases: { zh: ['上海交大', '上交'], en: ['SJTU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'sichuan-university', displayNames: { zh: '四川大学' }, aliases: { zh: ['川大'], en: ['SCU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'south-china-university-of-technology', displayNames: { zh: '华南理工大学' }, aliases: { zh: ['华工'], en: ['SCUT'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'southeast-university', displayNames: { zh: '东南大学' }, aliases: { zh: ['东大'], en: ['SEU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'southern-medical-university', displayNames: { zh: '南方医科大学' }, aliases: { zh: ['南医大'], en: ['SMU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'southern-university-of-science-and-technology-sustech', displayNames: { zh: '南方科技大学' }, aliases: { zh: ['南科大'], en: ['SUSTech'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'sun-yat-sen-university', displayNames: { zh: '中山大学' }, aliases: { zh: ['中大'], en: ['SYSU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'tianjin-university', displayNames: { zh: '天津大学' }, aliases: { zh: ['天大'], en: ['TJU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'tongji-university', displayNames: { zh: '同济大学' }, aliases: { zh: ['同济'], en: ['TJU Tongji'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'tsinghua-university', displayNames: { zh: '清华大学' }, aliases: { zh: ['清华'], en: ['THU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'university-of-science-and-technology-of-china', displayNames: { zh: '中国科学技术大学' }, aliases: { zh: ['中科大'], en: ['USTC'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'wuhan-university', displayNames: { zh: '武汉大学' }, aliases: { zh: ['武大'], en: ['WHU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'xian-jiaotong-university', displayNames: { zh: '西安交通大学' }, aliases: { zh: ['西安交大', '西交'], en: ['XJTU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'xiamen-university', displayNames: { zh: '厦门大学' }, aliases: { zh: ['厦大'], en: ['XMU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'zhejiang-university', displayNames: { zh: '浙江大学' }, aliases: { zh: ['浙大'], en: ['ZJU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'city-university-of-hong-kong', displayNames: { zh: '香港城市大学' }, aliases: { zh: ['港城大'], en: ['CityUHK', 'CityU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'hong-kong-baptist-university', displayNames: { zh: '香港浸会大学' }, aliases: { zh: ['香港浸會大學', '浸会大学', '浸大'], en: ['HKBU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'the-chinese-university-of-hong-kong', displayNames: { zh: '香港中文大学' }, aliases: { zh: ['香港中文大學', '港中大'], en: ['CUHK'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'the-hong-kong-polytechnic-university', displayNames: { zh: '香港理工大学' }, aliases: { zh: ['香港理工大學', '港理工'], en: ['PolyU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'the-hong-kong-university-of-science-and-technology', displayNames: { zh: '香港科技大学' }, aliases: { zh: ['香港科技大學', '港科大'], en: ['HKUST'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'the-university-of-hong-kong', displayNames: { zh: '香港大学' }, aliases: { zh: ['香港大學', '港大'], en: ['HKU'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'national-taiwan-university', displayNames: { zh: '国立台湾大学' }, aliases: { zh: ['國立臺灣大學', '台湾大学', '臺灣大學', '台大'], en: ['NTU Taiwan'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'university-of-macau', displayNames: { zh: '澳门大学' }, aliases: { zh: ['澳門大學', '澳大'], en: ['UM'] }, translationStatus: 'verified', verifiedAt },
  { universityId: 'national-university-of-singapore', displayNames: { zh: '新加坡国立大学' }, aliases: { zh: ['新加坡國立大學', '新国大'], en: ['NUS'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'nanyang-technological-university', displayNames: { zh: '南洋理工大学' }, aliases: { zh: ['南洋理工大學'], en: ['NTU Singapore'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'harvard-university', displayNames: { zh: '哈佛大学' }, aliases: { zh: ['哈佛大學'], en: ['Harvard'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'massachusetts-institute-of-technology-mit', displayNames: { zh: '麻省理工学院' }, aliases: { zh: ['麻省理工學院', '麻省理工'], en: ['MIT'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'stanford-university', displayNames: { zh: '斯坦福大学' }, aliases: { zh: ['史丹福大学', '史丹福大學'], en: ['Stanford'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'university-of-oxford', displayNames: { zh: '牛津大学' }, aliases: { zh: ['牛津大學'], en: ['Oxford'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'university-of-cambridge', displayNames: { zh: '剑桥大学' }, aliases: { zh: ['劍橋大學'], en: ['Cambridge'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'university-college-london-ucl', displayNames: { zh: '伦敦大学学院' }, aliases: { zh: ['倫敦大學學院'], en: ['UCL'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'university-of-toronto', displayNames: { zh: '多伦多大学' }, aliases: { zh: ['多倫多大學'], en: ['U of T'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'university-of-british-columbia', displayNames: { zh: '不列颠哥伦比亚大学' }, aliases: { zh: ['英属哥伦比亚大学', '卑詩大學'], en: ['UBC'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'mcgill-university', displayNames: { zh: '麦吉尔大学' }, aliases: { zh: ['麥基爾大學'], en: ['McGill'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'the-university-of-melbourne', displayNames: { zh: '墨尔本大学' }, aliases: { zh: ['墨爾本大學'], en: ['University of Melbourne'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'the-university-of-sydney', displayNames: { zh: '悉尼大学' }, aliases: { zh: ['雪梨大学', '雪梨大學'], en: ['University of Sydney'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'the-australian-national-university', displayNames: { zh: '澳大利亚国立大学' }, aliases: { zh: ['澳洲國立大學'], en: ['ANU', 'Australian National University'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'seoul-national-university', displayNames: { zh: '首尔大学' }, aliases: { zh: ['首爾大學'], en: ['SNU'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'korea-advanced-institute-of-science-and-technology-kaist', displayNames: { zh: '韩国科学技术院' }, aliases: { zh: ['韓國科學技術院'], en: ['KAIST'] }, translationStatus: 'common-name', verifiedAt },
  { universityId: 'swiss-federal-institute-of-technology-zurich-eth-zurich', displayNames: { zh: '苏黎世联邦理工学院' }, aliases: { zh: ['蘇黎世聯邦理工學院'], en: ['ETH Zurich'] }, translationStatus: 'common-name', verifiedAt },
]

export const universityAliases: Record<string, UniversityAliasOverride> = Object.fromEntries(
  entries.map((entry) => [entry.universityId, entry]),
)

export const universityAliasCount = entries.length
