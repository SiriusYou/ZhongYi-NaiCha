package com.zhongyi.naicha.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.zhongyi.naicha.R

class StepAdapter : RecyclerView.Adapter<StepAdapter.StepViewHolder>() {
    
    private val steps = mutableListOf<String>()
    
    fun setSteps(newSteps: List<String>) {
        steps.clear()
        steps.addAll(newSteps)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StepViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_step, parent, false)
        return StepViewHolder(view)
    }

    override fun onBindViewHolder(holder: StepViewHolder, position: Int) {
        holder.bind(steps[position], position + 1)
    }

    override fun getItemCount(): Int = steps.size

    class StepViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvStepNumber: TextView = itemView.findViewById(R.id.tvStepNumber)
        private val tvStepDescription: TextView = itemView.findViewById(R.id.tvStepDescription)

        fun bind(stepDescription: String, stepNumber: Int) {
            tvStepNumber.text = stepNumber.toString()
            tvStepDescription.text = stepDescription
        }
    }
} 