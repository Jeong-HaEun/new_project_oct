export async function withDeadline(operation, milliseconds) {
  const controller = new AbortController()
  let timer
  const deadline = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      const error = new Error(
        `설정한 최대 대기 시간(${milliseconds / 1000}초)을 초과했습니다.`,
      )
      error.code = 'AI_DEADLINE'
      reject(error)
    }, milliseconds)
  })
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      deadline,
    ])
  } finally {
    clearTimeout(timer)
  }
}
