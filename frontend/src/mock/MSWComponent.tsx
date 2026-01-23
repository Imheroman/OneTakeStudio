'use client'

import { useEffect } from "react"

export const MSWComponet = () => {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
                require('./browser').worker.start()
            }
        }
    }, [])

    return null
}