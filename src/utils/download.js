// 글자를 파일로 만들어 브라우저가 내려받게 한다.
// 브라우저 기능(Blob · 링크 클릭)을 써서 node --test 대신 화면에서 확인한다.
export function downloadText(fileName, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
