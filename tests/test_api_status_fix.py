#!/usr/bin/env python3
"""
API状态码修复的单元测试
验证所有API提供者的状态码标准化功能
"""

import unittest
import sys
import os

# 添加src目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from ip_checker.ip_utils import normalize_api_status


class TestAPIStatusFix(unittest.TestCase):
    """API状态码修复测试类"""
    
    def test_proxycheck_ok_to_success(self):
        """测试ProxyCheck.io的'ok'状态转换为'success'"""
        response = {
            'status': 'ok',
            'query': '8.8.8.8',
            'country': 'US'
        }
        
        result = normalize_api_status(response, 'proxycheck')
        
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['query'], '8.8.8.8')
        self.assertEqual(result['country'], 'US')
        # 确保原始响应没有被修改
        self.assertEqual(response['status'], 'ok')
    
    def test_proxycheck_error_unchanged(self):
        """测试ProxyCheck.io的'error'状态保持不变"""
        response = {
            'status': 'error',
            'message': 'Invalid API key'
        }
        
        result = normalize_api_status(response, 'proxycheck')
        
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['message'], 'Invalid API key')
    
    def test_ipinfo_success_unchanged(self):
        """测试IPinfo.io的'success'状态保持不变"""
        response = {
            'status': 'success',
            'ip': '8.8.8.8',
            'country': 'US'
        }
        
        result = normalize_api_status(response, 'ipinfo')
        
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['ip'], '8.8.8.8')
    
    def test_ipapi_add_success_status(self):
        """测试ip-api.com添加'success'状态"""
        response = {
            'query': '8.8.8.8',
            'country': 'United States',
            'status': 'success'  # ip-api.com实际上有status字段
        }
        
        result = normalize_api_status(response, 'ip-api')
        
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['query'], '8.8.8.8')
    
    def test_ipapi_add_fail_status(self):
        """测试ip-api.com在没有query时添加'fail'状态"""
        response = {
            'message': 'invalid query'
        }
        
        result = normalize_api_status(response, 'ip-api')
        
        self.assertEqual(result['status'], 'fail')
        self.assertEqual(result['message'], 'invalid query')
    
    def test_unknown_provider_unchanged(self):
        """测试未知提供者的响应保持不变"""
        response = {
            'status': 'ok',
            'data': 'some data'
        }
        
        result = normalize_api_status(response, 'unknown')
        
        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['data'], 'some data')
    
    def test_none_response(self):
        """测试None响应"""
        result = normalize_api_status(None, 'proxycheck')
        self.assertIsNone(result)
    
    def test_non_dict_response(self):
        """测试非字典响应"""
        result = normalize_api_status("not a dict", 'proxycheck')
        self.assertEqual(result, "not a dict")
    
    def test_case_insensitive_provider(self):
        """测试提供者名称大小写不敏感"""
        response = {
            'status': 'ok',
            'query': '8.8.8.8'
        }
        
        # 测试大写
        result1 = normalize_api_status(response, 'PROXYCHECK')
        self.assertEqual(result1['status'], 'success')
        
        # 测试混合大小写
        result2 = normalize_api_status(response, 'ProxyCheck')
        self.assertEqual(result2['status'], 'success')
    
    def test_real_proxycheck_response_format(self):
        """测试真实的ProxyCheck.io响应格式"""
        # 模拟真实的ProxyCheck.io响应
        real_response = {
            'status': 'ok',
            '8.8.8.8': {
                'proxy': 'no',
                'type': '',
                'risk': 0,
                'country': 'US',
                'city': 'Mountain View',
                'isp': 'Google LLC',
                'asn': 'AS15169'
            }
        }
        
        result = normalize_api_status(real_response, 'proxycheck')
        
        self.assertEqual(result['status'], 'success')
        self.assertIn('8.8.8.8', result)
        self.assertEqual(result['8.8.8.8']['proxy'], 'no')


if __name__ == '__main__':
    # 创建测试套件
    suite = unittest.TestLoader().loadTestsFromTestCase(TestAPIStatusFix)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果
    if result.wasSuccessful():
        print("\n🎉 所有API状态码修复测试通过！")
        sys.exit(0)
    else:
        print(f"\n❌ 测试失败: {len(result.failures)} 个失败, {len(result.errors)} 个错误")
        sys.exit(1)
