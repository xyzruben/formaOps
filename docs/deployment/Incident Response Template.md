# Deployment Failure Incident Report

**Incident ID:** DEPLOY-YYYY-MM-DD-XXX  
**Date Created:** [YYYY-MM-DD]  
**Reporter:** [Name]  
**Status:** 🔴 Open / 🟡 Investigating / 🟢 Resolved

## 📋 Summary

- **Time**: [Start time - End time (if resolved)]
- **Severity**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)
- **Impact**: [Brief description of user/business impact]
- **Environment**: Production / Staging / Development
- **Affected Services**: [List services/features affected]

## ⏰ Timeline

| Time    | Event                 | Action Taken                   | By Whom         |
| ------- | --------------------- | ------------------------------ | --------------- |
| [HH:MM] | Issue first detected  | [How was it discovered]        | [Person/System] |
| [HH:MM] | Response initiated    | [First action taken]           | [Person]        |
| [HH:MM] | Root cause identified | [What was found]               | [Person]        |
| [HH:MM] | Fix implemented       | [What was done]                | [Person]        |
| [HH:MM] | Issue resolved        | [How was resolution confirmed] | [Person]        |

## 🔍 Root Cause Analysis

### What Went Wrong

[Detailed description of the technical failure]

### Why It Happened

[Root cause analysis - what conditions led to the failure]

### How We Detected It

- [ ] Automated monitoring alert
- [ ] User report
- [ ] Manual discovery
- [ ] CI/CD pipeline failure
- [ ] Other: ****\_\_\_****

### Contributing Factors

- [ ] Dependency misclassification
- [ ] Emergency bypass left in place
- [ ] Missing validation step
- [ ] External service failure
- [ ] Human error
- [ ] Process not followed
- [ ] Other: ****\_\_\_****

## 🛠️ Resolution

### Immediate Fix Applied

```bash
# Commands executed to resolve the issue
[Paste actual commands used]
```

**Files Modified:**

- `[file1]` - [brief description of changes]
- `[file2]` - [brief description of changes]

### Emergency Measures Used

- [ ] Emergency bypass enabled (⚠️ Requires P0 justification)
- [ ] Rollback to previous version
- [ ] Feature flag disabled
- [ ] Hot fix deployed
- [ ] None - standard fix process

### Long-term Fix Plan

[What needs to be done to prevent recurrence]

## 📊 Impact Assessment

### Quantified Impact

- **Duration**: [X hours/minutes]
- **Users Affected**: [Number/percentage]
- **Revenue Impact**: $[amount] (if applicable)
- **SLA Breach**: Yes/No

### Service Degradation

- [ ] Complete outage
- [ ] Partial functionality loss
- [ ] Performance degradation
- [ ] Visual/cosmetic issues only
- [ ] Internal tools only

## 🎯 Prevention Measures

### Immediate Actions (This Week)

- [ ] Update documentation: [specific docs to update]
- [ ] Add monitoring/alerting: [specific metrics]
- [ ] Process improvement: [specific changes]
- [ ] Team communication: [what needs to be communicated]

### Long-term Actions (Next Sprint/Month)

- [ ] Architecture changes: [describe changes needed]
- [ ] Tool improvements: [specific tools to add/modify]
- [ ] Training: [what team needs to learn]
- [ ] Policy updates: [process changes needed]

## 📚 Lessons Learned

### What Worked Well

- [Things that helped in detection/resolution]

### What Could Be Improved

- [Areas for improvement in process/tools/response]

### Knowledge Gaps Identified

- [Things the team didn't know that contributed to the issue]

## 📋 Action Items

| Action                | Owner    | Due Date | Status                |
| --------------------- | -------- | -------- | --------------------- |
| [Specific task]       | [Person] | [Date]   | Open/In Progress/Done |
| Update CI/CD pipeline | [Person] | [Date]   | Open/In Progress/Done |
| Documentation update  | [Person] | [Date]   | Open/In Progress/Done |

## 🔗 Related Information

### Reference Documents

- [CI/CD Failure Response Playbook](./CI-CD%20Failure%20Response%20Playbook.md)
- [Dependency Classification Guide](./Dependency%20Classification%20Guide.md)
- [Emergency Response Quick Reference](./Emergency%20Response%20Quick%20Reference.md)

### Related Incidents

- [Link to similar past incidents]
- [Link to related infrastructure issues]

### Technical Details

```
[Paste relevant error messages, stack traces, logs]
```

### Communication Log

- [ ] Team notified via [Slack/email/other]
- [ ] Stakeholders informed
- [ ] Users notified (if applicable)
- [ ] Post-incident communication sent

---

## 📝 Sign-off

**Incident Commander:** [Name] - [Date]  
**Technical Lead:** [Name] - [Date]  
**Product Owner:** [Name] - [Date] (if applicable)

---

## 📊 Metrics for Review

### Build Success Rate

- Pre-incident: [X%] over [time period]
- Post-incident: [X%] over [time period]

### Response Time

- Detection to acknowledgment: [X minutes]
- Acknowledgment to resolution: [X minutes]
- Total incident duration: [X minutes/hours]

### Prevention Effectiveness

- Similar incidents in past 30 days: [X]
- First occurrence of this type: Yes/No
- Related to known technical debt: Yes/No
