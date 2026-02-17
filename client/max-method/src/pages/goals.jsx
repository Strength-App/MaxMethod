function Goals() {
  return (
    <div className="goals-page">

    {/* Goals Page Header */}
    <header>
      <h1>Goals</h1>
    </header>

    {/* Workout Frequency Selection */}
    <main>
      <p className="subheading">How Many Days Do You Workout Each Week?</p>

      <div className="goals-days-options">
      <label>
        <input type="radio" name="days" /> 3 Days
      </label>

      <label>
        <input type="radio" name="days" /> 4 Days
      </label>

      <label>
        <input type="radio" name="days" /> 5 Days
      </label>
      </div>


      <p className="subheading">What Is Your Fitness Goal?</p>

      <div className="goals-workout-options">
      <label>
        <input type="radio" name="goal" /> Lose Weight
      </label>

      <label>
        <input type="radio" name="goal" /> Build Muscle
      </label>

      <label>
        <input type="radio" name="goal" /> Get Stronger
      </label>

      <label>
        <input type="radio" name="goal" /> Muscle Definition
      </label>
      </div>

      <div className="goals-submit">
        <button type="submit">Submit</button>
      </div>

    </main>
    </div>
  )
}

export default Goals;