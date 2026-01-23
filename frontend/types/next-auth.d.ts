import NextAuth, {DefaultSession} from "next-auth"

declare module 'next-auth' {
    interface Session {
        // 세션 객체에 accessToken 타입을 추가
        accessToken?: string
        user: {
            id?: string
        } & DefaultSession['user']
    }

    interface User {
        // 백엔드로부터 받는 유저 객체 규격에 맞게 정의
        accessToken?:string
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        // JWT 토큰 내부에 담길 데이터 타입 정의
        accessToken?: string
    }
}