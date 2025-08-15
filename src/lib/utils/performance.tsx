import React from 'react';
import { performanceMonitor } from '../monitoring/performance-monitor';

// Performance utilities for optimizing React components and API calls

export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export class PerformanceUtils {
  // Debounce function to limit API calls
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }

  // Throttle function to limit execution frequency
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let isThrottled = false;
    return (...args: Parameters<T>) => {
      if (isThrottled) return;
      
      func.apply(null, args);
      isThrottled = true;
      setTimeout(() => (isThrottled = false), delay);
    };
  }

  // Measure async operation performance
  static async measureAsync<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      performanceMonitor.recordMetric({
        name: operationName,
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        metadata: { success: true },
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      performanceMonitor.recordMetric({
        name: operationName,
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        metadata: { success: false, error: String(error) },
      });
      
      throw error;
    }
  }

  // Lazy load component with loading fallback
  static lazy<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ) {
    const LazyComponent = React.lazy(importFunc);
    
    if (!fallback) {
      return LazyComponent;
    }
    
    return function LazyWrapper(props: React.ComponentProps<T>) {
      return (
        <React.Suspense fallback={React.createElement(fallback)}>
          <LazyComponent {...props} />
        </React.Suspense>
      );
    };
  }

  // Image preloader for better UX
  static preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  // Intersection Observer for lazy loading
  static createIntersectionObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    });
  }

  // Bundle size analyzer helper
  static analyzeBundleSize(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Run "npm run analyze" to analyze bundle size');
    }
  }

  // Memory usage monitor
  static getMemoryUsage(): MemoryInfo | null {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as Performance & { memory: MemoryInfo }).memory;
    }
    return null;
  }

  // Report Web Vitals
  static reportWebVitals(metric: WebVitalsMetric): void {
    if (process.env.NODE_ENV === 'production') {
      performanceMonitor.recordMetric({
        name: `web_vitals_${metric.name.toLowerCase()}`,
        value: metric.value,
        unit: metric.name === 'CLS' ? 'count' : 'ms',
        timestamp: new Date(),
        metadata: {
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
        },
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Web Vital ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const React = require('react');
  
  const recordMetric = React.useCallback((name: string, value: number, unit: 'ms' | 'count' = 'ms') => {
    performanceMonitor.recordMetric({
      name,
      value,
      unit,
      timestamp: new Date(),
    });
  }, []);

  const measureRender = React.useCallback((componentName: string) => {
    const start = performance.now();
    
    // Schedule the metric recording for the next tick to avoid hooks violations
    setTimeout(() => {
      const duration = performance.now() - start;
      recordMetric(`render_${componentName}`, duration);
    }, 0);
  }, [recordMetric]);

  return {
    recordMetric,
    measureRender,
  };
}

// HOC for measuring component render performance
export function withPerformanceMonitoring<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  displayName: string
): React.ComponentType<T> {
  const PerformanceMonitoredComponent: React.ComponentType<T> = (props) => {
    const startTime = React.useRef(performance.now());
    
    React.useEffect(() => {
      const renderTime = performance.now() - startTime.current;
      performanceMonitor.recordMetric({
        name: `component_render_${displayName}`,
        value: renderTime,
        unit: 'ms',
        timestamp: new Date(),
      });
    });

    return <Component {...props} />;
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${displayName})`;
  
  return PerformanceMonitoredComponent;
}

// Cache manager for API responses
export class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlSeconds = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Auto cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheManager = new CacheManager();

// Auto cleanup cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => cacheManager.cleanup(), 5 * 60 * 1000);
}