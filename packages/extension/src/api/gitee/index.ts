import axios from 'axios';

const giteeBaseURL = 'https://gitee.com/api/v5';

export const giteeInstance = axios.create({
  baseURL: giteeBaseURL,
  params: {
    access_token: '887c40f1f0058f160c8af09c31216746',
  },
});
