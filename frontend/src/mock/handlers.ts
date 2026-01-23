import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, async () => {
    return HttpResponse.json({
      accessToken: "mocked-access-token-123",
      user: {
        id: "user-1",
        email: "ssafy@samsung.com",
        name: "싸피생"
      }
    }, { status: 200 })
  }),
]