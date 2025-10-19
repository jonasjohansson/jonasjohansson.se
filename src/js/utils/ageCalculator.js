// Age Calculator - Real-time age calculation
// Born: June 20, 1987

export function calculateAge(birthDate) {
  const now = new Date();
  const birth = new Date(birthDate);

  // Calculate years
  let years = now.getFullYear() - birth.getFullYear();

  // Calculate months and days
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  // Adjust if the birthday hasn't occurred this year yet
  if (months < 0 || (months === 0 && days < 0)) {
    years--;
    months += 12;
  }

  // Adjust days if negative
  if (days < 0) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += lastMonth.getDate();
    months--;
  }

  // Calculate total days since birth
  const totalDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));

  return {
    years,
    months,
    days,
    totalDays,
  };
}

export function formatAge(birthDate) {
  const age = calculateAge(birthDate);

  // Convert months to days and add to total days
  const totalDaysFromMonths = age.months * 30.44; // Average days per month
  const totalDays = Math.floor(age.days + totalDaysFromMonths);

  return `${age.years} years, ${totalDays} days`;
}

export function updateAboutContent() {
  const agePlaceholder = document.getElementById("age-placeholder");
  if (!agePlaceholder) {
    // Retry after a short delay if element not found
    setTimeout(updateAboutContent, 100);
    return;
  }

  const birthDate = "1987-06-20"; // June 20, 1987
  const ageText = formatAge(birthDate);

  // Update the age placeholder with the dynamic age
  agePlaceholder.textContent = `(${ageText})`;
}

// Auto-update age every day at midnight
export function startAgeUpdater() {
  // Update immediately
  updateAboutContent();

  // Calculate time until next midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow.getTime() - now.getTime();

  // Set timeout to update at midnight
  setTimeout(() => {
    updateAboutContent();
    // Then update every 24 hours
    setInterval(updateAboutContent, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
}
