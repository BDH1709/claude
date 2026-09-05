package nl.bdh.stilte

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Fase 0: een lege home-activity. Alleen een label en een knop naar de
 * systeeminstellingen, zodat je altijd terug kunt naar je oude launcher —
 * ook als er verder nog niets werkt.
 */
class HomeActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A1E20"))
            setPadding(56, 0, 56, 0)
        }

        root.addView(TextView(this).apply {
            text = getString(R.string.phase0_label)
            setTextColor(Color.parseColor("#E6F1EF"))
            textSize = 22f
            gravity = Gravity.CENTER
        })

        root.addView(Button(this).apply {
            text = getString(R.string.phase0_settings)
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_HOME_SETTINGS))
            }
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = 64; gravity = Gravity.CENTER_HORIZONTAL })

        setContentView(root)
    }

    override fun onBackPressed() {
        // Een launcher hoort niet weg te navigeren met back.
    }
}
