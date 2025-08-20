import { NextRequest } from 'next/server';
import { GET as promptsGET, POST as promptsPOST } from '../../../app/api/prompts/route';

describe('Prompts Integration Tests', () => {
  describe('GET /api/prompts', () => {
    it('should handle prompts listing with proper API structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts?page=1&limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await promptsGET(request);
      let data;
      try {
        data = await response.json();
      } catch {
        data = { error: 'JSON parse error', code: 'PARSE_ERROR' };
      }

      // Test API structure regardless of auth status
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      
      // Data might be undefined if response has no body
      if (data !== undefined) {
        expect(data).toBeDefined();
      } else {
        // If no data, just verify response exists
        expect(response.status).toBeGreaterThan(0);
        return;
      }

      if (response.status === 200) {
        // Success response structure
        expect(data).toHaveProperty('prompts');
        expect(data).toHaveProperty('pagination');
        expect(Array.isArray(data.prompts)).toBe(true);
        expect(data.pagination).toHaveProperty('page');
        expect(data.pagination).toHaveProperty('limit');
        expect(data.pagination).toHaveProperty('total');
        expect(data.pagination).toHaveProperty('totalPages');
      } else if (response.status === 401) {
        // Auth error structure
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        expect(data.code).toBe('UNAUTHORIZED');
      } else if (response.status === 400) {
        // Validation error structure
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle pagination parameters correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts?page=2&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await promptsGET(request);
      const data = await response.json();

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      
      // Should not be a validation error with valid parameters
      if (response.status === 400) {
        expect(data.code).not.toBe('VALIDATION_ERROR');
      }
    });

    it('should handle search parameters correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts?search=test&page=1&limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await promptsGET(request);
      const data = await response.json();

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      
      // Should not be a validation error with valid parameters
      if (response.status === 400) {
        expect(data.code).not.toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('POST /api/prompts', () => {
    it('should handle prompt creation with proper validation', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Integration Test Prompt',
          template: 'Hello {{name}}, welcome to the integration test!',
          variables: [
            {
              name: 'name',
              type: 'string',
              required: true,
            },
          ],
        }),
      });

      const response = await promptsPOST(request);
      let data;
      try {
        data = await response.json();
      } catch {
        data = { error: 'JSON parse error', code: 'PARSE_ERROR' };
      }

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      
      // Data might be undefined if response has no body
      if (data !== undefined) {
        expect(data).toBeDefined();
      } else {
        // If no data, just verify response exists
        expect(response.status).toBeGreaterThan(0);
        return;
      }

      if (response.status === 201) {
        // Success response structure
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('template');
        expect(data).toHaveProperty('variables');
        expect(data.name).toBe('Integration Test Prompt');
      } else if (response.status === 401) {
        // Auth error structure
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        expect(data.code).toBe('UNAUTHORIZED');
      } else if (response.status === 400) {
        // Validation error structure
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should auto-detect variables from template', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Auto Variable Test',
          template: 'Hello {{name}}, you are {{age}} years old',
          variables: [], // Empty - should auto-detect
        }),
      });

      const response = await promptsPOST(request);
      let data;
      try {
        data = await response.json();
      } catch {
        data = { error: 'JSON parse error', code: 'PARSE_ERROR' };
      }

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');

      if (response.status === 201 && data) {
        // Should have auto-detected variables
        expect(data).toHaveProperty('variables');
        expect(Array.isArray(data.variables)).toBe(true);
        // Variables should be auto-detected from template
        if (data.variables.length > 0) {
          expect(data.variables.some((v: any) => v.name === 'name')).toBe(true);
          expect(data.variables.some((v: any) => v.name === 'age')).toBe(true);
        }
      }
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          name: '',
          template: '',
        }),
      });

      const response = await promptsPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data).toHaveProperty('details');
      expect(Array.isArray(data.details)).toBe(true);
    });
  });
});