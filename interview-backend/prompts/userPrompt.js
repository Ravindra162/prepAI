export function getUserPrompt(candidateInfo, resumeData) {
    return `Start the interview with this candidate:
Name: ${candidateInfo?.name || 'Candidate'}

Give a brief, warm greeting and ask them to introduce themselves.`
}